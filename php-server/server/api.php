<?php

require __DIR__ . '/../vendor/autoload.php';

use Messenger\Database;
use Messenger\JWTHelper;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = new Database();
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && $requestUri === '/api/auth/register') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Имя и пароль обязательны']);
        exit;
    }

    if ($db->getUserByUsername($username)) {
        http_response_code(400);
        echo json_encode(['error' => 'Пользователь с таким именем уже существует']);
        exit;
    }

    $id = bin2hex(random_bytes(16));
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $db->createUser($id, $username, $passwordHash);
    $token = JWTHelper::generate($id, $username);

    echo json_encode([
        'token' => $token,
        'user' => ['id' => $id, 'username' => $username, 'avatar' => null]
    ]);
    exit;
}

if ($method === 'POST' && $requestUri === '/api/auth/login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    $user = $db->getUserByUsername($username);
    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Неверное имя или пароль']);
        exit;
    }

    $token = JWTHelper::generate($user['id'], $user['username']);
    echo json_encode([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'avatar' => $user['avatar'] ?? null
        ]
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);