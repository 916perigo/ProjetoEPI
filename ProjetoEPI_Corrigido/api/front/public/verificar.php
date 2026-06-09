<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configuração dos Headers para API JSON e CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Trata a requisição de pré-teste (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Garante que só aceita requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido. Use POST.']);
    exit;
}

// Conexão com o banco de dados
require_once __DIR__ . '/../../config/db.php';
$database = new Database();
$db = $database->getConnection();

try {
    // Captura o JSON enviado no corpo da requisição
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true);

    // Valida se o JSON é válido
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'error' => 'JSON inválido ou malformado',
            'received_raw' => $raw_input
        ]);
        exit;
    }

    // Verifica se os campos obrigatórios foram enviados
    if (isset($data['id_usuario']) && isset($data['status'])) {
        
        $id_usuario = $data['id_usuario'];
        $status = $data['status'];

        // --- VALIDAÇÃO CRÍTICA ---
        // Verifica se o id_usuario realmente existe na tabela 'usuarios'
        $checkUser = $db->prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = :id_usuario LIMIT 1");
        $checkUser->bindParam(':id_usuario', $id_usuario);
        $checkUser->execute();

        if ($checkUser->rowCount() === 0) {
            http_response_code(400);
            echo json_encode([
                'error' => "O id_usuario '$id_usuario' não existe na tabela de usuários. Por isso o dado sumiria do relatório.",
                'received' => $data
            ]);
            exit;
        }
        // -------------------------

        // Se o usuário existe, faz a inserção com segurança
        $stmt = $db->prepare("INSERT INTO leituras_epi (id_usuario, status) VALUES (:id_usuario, :status)");
        $stmt->bindParam(':id_usuario', $id_usuario);
        $stmt->bindParam(':status', $status);
        
        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode([
                'success' => 'Verificação salva com sucesso',
                'id_inserido' => $db->lastInsertId()
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'error' => 'Erro interno ao salvar no banco de dados',
                'db_error' => $stmt->errorInfo()
            ]);
        }

    } else {
        http_response_code(400);
        echo json_encode([
            'error' => 'Dados incompletos. Envie id_usuario e status.', 
            'received' => $data
        ]);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro interno no servidor', 
        'details' => $e->getMessage()
    ]);
}
?>