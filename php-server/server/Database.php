<?php

namespace Messenger;

class Database {
    private $db;

    public function __construct($dbPath = __DIR__ . '/../data/messenger.db') {
        $dir = dirname($dbPath);
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $this->db = new \SQLite3($dbPath);
        $this->initialize();
    }

    private function initialize() {
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s','now'))
            );
        ");

        $this->db->exec("
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                from_id TEXT NOT NULL,
                to_id TEXT NOT NULL,
                text TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                read_at INTEGER DEFAULT NULL
            );
        ");

        // Миграция: read_at
        $this->ensureColumn('messages', 'read_at', "ALTER TABLE messages ADD COLUMN read_at INTEGER DEFAULT NULL");

        // Миграция: avatar у users
        $this->ensureColumn('users', 'avatar', "ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL");

        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(chat_id, to_id, read_at);");
    }

    private function ensureColumn($table, $column, $alterSql) {
        $has = false;
        $result = $this->db->query("PRAGMA table_info({$table})");
        if ($result) {
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                if ($row['name'] === $column) { $has = true; break; }
            }
        }
        if (!$has) {
            $this->db->exec($alterSql);
            echo "[DB] Добавлена колонка {$table}.{$column}\n";
        }
    }

    public function createUser($id, $username, $passwordHash) {
        $stmt = $this->db->prepare("INSERT INTO users (id, username, password_hash) VALUES (:id, :username, :hash)");
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $stmt->bindValue(':username', $username, SQLITE3_TEXT);
        $stmt->bindValue(':hash', $passwordHash, SQLITE3_TEXT);
        return $stmt->execute();
    }

    public function getUserByUsername($username) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE username = :username");
        $stmt->bindValue(':username', $username, SQLITE3_TEXT);
        $result = $stmt->execute();
        return $result ? $result->fetchArray(SQLITE3_ASSOC) : null;
    }

    public function getUserById($id) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = :id");
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $result = $stmt->execute();
        return $result ? $result->fetchArray(SQLITE3_ASSOC) : null;
    }

    public function getAllUsers() {
        $result = $this->db->query("SELECT id, username, avatar, created_at FROM users");
        $users = [];
        if ($result) {
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $users[] = $row;
            }
        }
        return $users;
    }

    public function updateAvatar($userId, $avatar) {
        $stmt = $this->db->prepare("UPDATE users SET avatar = :avatar WHERE id = :id");
        $stmt->bindValue(':avatar', $avatar, $avatar === null ? SQLITE3_NULL : SQLITE3_TEXT);
        $stmt->bindValue(':id', $userId, SQLITE3_TEXT);
        return $stmt->execute();
    }

    public function saveMessage($id, $chatId, $fromId, $toId, $text, $timestamp) {
        $stmt = $this->db->prepare("
            INSERT INTO messages (id, chat_id, from_id, to_id, text, timestamp, read_at)
            VALUES (:id, :chat, :from, :to, :text, :time, NULL)
        ");
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $stmt->bindValue(':chat', $chatId, SQLITE3_TEXT);
        $stmt->bindValue(':from', $fromId, SQLITE3_TEXT);
        $stmt->bindValue(':to', $toId, SQLITE3_TEXT);
        $stmt->bindValue(':text', $text, SQLITE3_TEXT);
        $stmt->bindValue(':time', $timestamp, SQLITE3_INTEGER);
        return $stmt->execute();
    }

    public function getChatMessages($chatId, $limit = 100) {
        $stmt = $this->db->prepare("
            SELECT * FROM messages 
            WHERE chat_id = :chat 
            ORDER BY timestamp ASC 
            LIMIT :limit
        ");
        $stmt->bindValue(':chat', $chatId, SQLITE3_TEXT);
        $stmt->bindValue(':limit', $limit, SQLITE3_INTEGER);
        $result = $stmt->execute();
        $messages = [];
        if ($result) {
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $row['read_at'] = $row['read_at'] !== null ? (int)$row['read_at'] : null;
                $row['timestamp'] = (int)$row['timestamp'];
                $messages[] = $row;
            }
        }
        return $messages;
    }

    public function markMessagesRead($chatId, $readerId) {
        $stmt = $this->db->prepare("
            SELECT id FROM messages 
            WHERE chat_id = :chat 
              AND to_id = :reader 
              AND read_at IS NULL
        ");
        $stmt->bindValue(':chat', $chatId, SQLITE3_TEXT);
        $stmt->bindValue(':reader', $readerId, SQLITE3_TEXT);
        $result = $stmt->execute();
        $ids = [];
        if ($result) {
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $ids[] = $row['id'];
            }
        }

        if (empty($ids)) {
            return ['ids' => [], 'read_at' => null];
        }

        $now = time() * 1000;
        $stmt = $this->db->prepare("
            UPDATE messages 
            SET read_at = :now 
            WHERE chat_id = :chat 
              AND to_id = :reader 
              AND read_at IS NULL
        ");
        $stmt->bindValue(':now', $now, SQLITE3_INTEGER);
        $stmt->bindValue(':chat', $chatId, SQLITE3_TEXT);
        $stmt->bindValue(':reader', $readerId, SQLITE3_TEXT);
        $stmt->execute();

        return ['ids' => $ids, 'read_at' => $now];
    }
}