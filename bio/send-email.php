<?php
// ⚠️ IMPORTANT : Aucun espace ou texte avant cette ligne !

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'Méthode non autorisée']));
}

$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    die(json_encode(['error' => 'JSON invalide']));
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$message = trim($data['message'] ?? '');

if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    die(json_encode(['error' => 'Tous les champs sont requis']));
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(['error' => 'Email invalide']));
}

// Sauvegarde dans un fichier (pour tester sans email)
$content = "\n=== Message reçu le " . date('d/m/Y à H:i:s') . " ===\n";
$content .= "Nom : $name\n";
$content .= "Email : $email\n";
$content .= "Message : $message\n";
$content .= str_repeat("-", 50) . "\n";

file_put_contents('messages.txt', $content, FILE_APPEND);

http_response_code(200);
die(json_encode([
    'success' => true,
    'message' => 'Message reçu !'
]));