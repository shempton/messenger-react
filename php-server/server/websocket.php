<?php
require __DIR__ . '/../vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Messenger\MessengerSocket;

$port = 4002;
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new MessengerSocket()
        )
    ),
    $port
);

echo "WebSocket сервер запущен на порту {$port}\n";
$server->run();