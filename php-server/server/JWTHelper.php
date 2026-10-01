<?php
namespace Messenger;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHelper {
    private static $secret = 'super-secret-key';
    private static $algorithm = 'HS256';

    public static function generate($userId, $username) {
        $payload = [
            'iss' => 'messenger',
            'iat' => time(),
            'exp' => time() + 3600 * 24 * 7, // 7 дней
            'id' => $userId,
            'username' => $username
        ];
        return JWT::encode($payload, self::$secret, self::$algorithm);
    }

    public static function decode($token) {
        return JWT::decode($token, new Key(self::$secret, self::$algorithm));
    }
}