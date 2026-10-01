<?php

namespace Messenger;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Messenger\Database;
use Messenger\JWTHelper;

class MessengerSocket implements MessageComponentInterface {
    protected $clients;
    protected $userConnections;
    protected $db;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->userConnections = [];
        $this->db = new Database();
    }

    public function onOpen(ConnectionInterface $conn) {
        $conn->authenticated = false;
        $conn->userId = null;
        $conn->username = null;
        $this->clients->attach($conn);
        echo "Новое соединение ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        echo "Получено сообщение от {$from->resourceId}: " . $msg . "\n";
        $data = json_decode($msg, true);
        if (!$data) { echo "  -> невалидный JSON\n"; return; }

        if (isset($data['type']) && $data['type'] === 'auth') {
            try {
                $decoded = JWTHelper::decode($data['token']);
                $from->userId = $decoded->id;
                $from->username = $decoded->username;
                $from->authenticated = true;

                if (!isset($this->userConnections[$from->userId])) {
                    $this->userConnections[$from->userId] = [];
                }
                $this->userConnections[$from->userId][] = $from;

                echo "  -> Пользователь {$from->username} аутентифицирован\n";
                $this->sendUserList($from);
                $this->broadcastOnlineStatus();
            } catch (\Exception $e) {
                echo "  -> Ошибка аутентификации: " . $e->getMessage() . "\n";
                $from->send(json_encode(['error' => 'Неверный токен']));
                $from->close();
            }
            return;
        }

        if (!$from->authenticated) {
            $from->send(json_encode(['error' => 'Требуется аутентификация']));
            $from->close();
            return;
        }

        switch ($data['type']) {
            case 'get_history':
                $chatId = $data['chatId'];
                $messages = $this->db->getChatMessages($chatId);
                foreach ($messages as &$m) {
                    $user = $this->db->getUserById($m['from_id']);
                    $m['fromName'] = $user ? $user['username'] : 'Unknown';
                    $m['fromAvatar'] = $user['avatar'] ?? null;
                }
                unset($m);
                $from->send(json_encode([
                    'type' => 'chat_history',
                    'chatId' => $chatId,
                    'messages' => $messages
                ]));
                break;

            case 'send_message':
                $to = $data['to'];
                $text = $data['text'];
                $chatId = $this->getChatId($from->userId, $to);
                $messageId = bin2hex(random_bytes(16));
                $timestamp = time() * 1000;

                $this->db->saveMessage($messageId, $chatId, $from->userId, $to, $text, $timestamp);

                $sender = $this->db->getUserById($from->userId);

                $messageData = [
                    'type' => 'new_message',
                    'id' => $messageId,
                    'chat_id' => $chatId,
                    'from_id' => $from->userId,
                    'to_id' => $to,
                    'text' => $text,
                    'timestamp' => $timestamp,
                    'read_at' => null,
                    'fromName' => $from->username,
                    'fromAvatar' => $sender['avatar'] ?? null
                ];

                $from->send(json_encode($messageData));

                if (isset($this->userConnections[$to])) {
                    foreach ($this->userConnections[$to] as $client) {
                        $client->send(json_encode($messageData));
                    }
                }
                break;

            case 'mark_read':
                $otherId = $data['fromId'] ?? null;
                if (!$otherId) break;

                $chatId = $this->getChatId($from->userId, $otherId);
                $result = $this->db->markMessagesRead($chatId, $from->userId);
                if (empty($result['ids'])) break;

                $payload = json_encode([
                    'type' => 'messages_read',
                    'chatId' => $chatId,
                    'readerId' => $from->userId,
                    'messageIds' => $result['ids'],
                    'read_at' => $result['read_at']
                ]);

                $from->send($payload);
                if (isset($this->userConnections[$otherId])) {
                    foreach ($this->userConnections[$otherId] as $client) {
                        $client->send($payload);
                    }
                }
                break;

            case 'typing':
                $to = $data['to'] ?? null;
                if (!$to) break;
                $payload = json_encode([
                    'type' => 'user_typing',
                    'from_id' => $from->userId,
                    'fromName' => $from->username
                ]);
                if (isset($this->userConnections[$to])) {
                    foreach ($this->userConnections[$to] as $client) {
                        $client->send($payload);
                    }
                }
                break;

            case 'update_avatar':
                $avatar = $data['avatar'] ?? null;
                if ($avatar !== null) {
                    if (!is_string($avatar) || strpos($avatar, 'data:image/') !== 0) {
                        echo "  -> Невалидный формат аватара\n";
                        break;
                    }
                    if (strlen($avatar) > 300000) {
                        echo "  -> Аватар слишком большой\n";
                        break;
                    }
                }
                $this->db->updateAvatar($from->userId, $avatar);
                echo "  -> Пользователь {$from->username} обновил аватар\n";
                $this->broadcastOnlineStatus();
                break;

            default:
                echo "  -> Неизвестный тип: " . ($data['type'] ?? 'none') . "\n";
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        if ($conn->userId && isset($this->userConnections[$conn->userId])) {
            $this->userConnections[$conn->userId] = array_filter(
                $this->userConnections[$conn->userId],
                fn($c) => $c !== $conn
            );
            if (empty($this->userConnections[$conn->userId])) {
                unset($this->userConnections[$conn->userId]);
            }
            $this->broadcastOnlineStatus();
        }
        echo "Соединение {$conn->resourceId} закрыто\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Ошибка: {$e->getMessage()}\n";
        $conn->close();
    }

    private function getChatId($id1, $id2) {
        return $id1 < $id2 ? "{$id1}_{$id2}" : "{$id2}_{$id1}";
    }

    private function sendUserList($conn) {
        $conn->send(json_encode(['type' => 'users_list', 'users' => $this->buildUserList()]));
    }

    private function broadcastOnlineStatus() {
        $message = json_encode(['type' => 'users_list', 'users' => $this->buildUserList()]);
        foreach ($this->clients as $client) {
            if ($client->authenticated) {
                $client->send($message);
            }
        }
    }

    private function buildUserList() {
        $users = $this->db->getAllUsers();
        return array_map(function($user) {
            return [
                'id' => $user['id'],
                'username' => $user['username'],
                'avatar' => $user['avatar'] ?? null,
                'online' => isset($this->userConnections[$user['id']]) && count($this->userConnections[$user['id']]) > 0
            ];
        }, $users);
    }
}