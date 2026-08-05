<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../app/controller/UsuarioController.php';

$database = new Database();
$db = $database->getConnection();

if (isset($_GET['route'])) {
    $route = trim($_GET['route'], '/');
} else {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $segments = explode('/', trim($path, '/'));
    $route = end($segments);
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($route) {

        case 'health':
            http_response_code(200);
            echo json_encode(['status' => 'ok - Sistema EPI CHECK online']);
            break;

        case 'login':
            if ($method === 'POST') {
                $usuarioController = new UsuarioController($db);
                $usuarioController->loginUsuario();
                exit;
            }
            http_response_code(405);
            echo json_encode(['error' => 'Metodo nao permitido']);
            break;

        case 'epi':
        case 'epis':
            if ($method === 'GET') {
                $stmt = $db->query("SELECT id_epi, nome_epi FROM epis");
                $epis = $stmt->fetchAll(PDO::FETCH_ASSOC);
                http_response_code(200);
                echo json_encode($epis);
                exit;
            }
            http_response_code(405);
            echo json_encode(['error' => 'Metodo nao permitido']);
            break;

        case 'relatorio':
        case 'relatorios':
            if ($method === 'GET') {
                $stmt = $db->query("SELECT l.id_leitura, u.nome as nome_usuario, u.email as email_usuario, l.data_hora as data_leitura, l.status as status_leitura FROM leituras_epi l JOIN usuarios u ON l.id_usuario = u.id_usuario ORDER BY l.data_hora DESC");
                $relatorio = $stmt->fetchAll(PDO::FETCH_ASSOC);
                http_response_code(200);
                echo json_encode($relatorio);
                exit;
            }
            http_response_code(405);
            echo json_encode(['error' => 'Metodo nao permitido']);
            break;

        case 'verificar':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                if (isset($data['id_usuario']) && isset($data['status'])) {
                    $stmt = $db->prepare("INSERT INTO leituras_epi (id_usuario, status) VALUES (:id_usuario, :status)");
                    $stmt->bindParam(':id_usuario', $data['id_usuario']);
                    $stmt->bindParam(':status', $data['status']);
                    if ($stmt->execute()) {
                        http_response_code(201);
                        echo json_encode(['success' => 'Verificação salva com sucesso']);
                    } else {
                        http_response_code(500);
                        echo json_encode(['error' => 'Erro ao salvar verificação']);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Dados incompletos']);
                }
                exit;
            }
            http_response_code(405);
            echo json_encode(['error' => 'Metodo nao permitido']);
            break;

        case 'cadastro':
            if ($method === 'POST') {
                $usuarioController = new UsuarioController($db);
                $usuarioController->cadastrarUsuario();
                exit;
            }
            http_response_code(405);
            echo json_encode(['error' => 'Metodo nao permitido']);
            break;

        case 'solicitar':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                if (isset($data['id_usuario']) && isset($data['id_epi']) && isset($data['descricao'])) {
                    $stmt = $db->prepare("INSERT INTO solicitacoes (id_usuario, id_epi, descricao) VALUES (:id_usuario, :id_epi, :descricao)");
                    $stmt->bindParam(':id_usuario', $data['id_usuario']);
                    $stmt->bindParam(':id_epi', $data['id_epi']);
                    $stmt->bindParam(':descricao', $data['descricao']);
                    if ($stmt->execute()) {
                        http_response_code(201);
                        echo json_encode(['success' => 'Solicitação enviada com sucesso']);
                    } else {
                        http_response_code(500);
                        echo json_encode(['error' => 'Erro ao salvar solicitação']);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Dados incompletos']);
                }
                exit;
            }
            http_response_code(405);
            echo json_encode(['error' => 'Metodo nao permitido']);
            break;

        case 'solicitacoes':
            if ($method === 'GET') {
                $stmt = $db->query("
                    SELECT s.id_solicitacao, s.data_solicitacao, s.status_solicitacao, s.descricao, 
                           u.nome as nome_usuario, e.nome_epi 
                    FROM solicitacoes s 
                    JOIN usuarios u ON s.id_usuario = u.id_usuario 
                    JOIN epis e ON s.id_epi = e.id_epi
                    ORDER BY s.data_solicitacao DESC
                ");
                $solicitacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);
                http_response_code(200);
                echo json_encode($solicitacoes);
                exit;
            }
            if ($method === 'PUT') {
                $data = json_decode(file_get_contents('php://input'), true);
                if (isset($data['id_solicitacao']) && isset($data['status'])) {
                    $stmt = $db->prepare("UPDATE solicitacoes SET status_solicitacao = :status WHERE id_solicitacao = :id_solicitacao");
                    $stmt->bindParam(':status', $data['status']);
                    $stmt->bindParam(':id_solicitacao', $data['id_solicitacao']);
                    if ($stmt->execute()) {
                        http_response_code(200);
                        echo json_encode(['success' => 'Status atualizado com sucesso']);
                    } else {
                        http_response_code(500);
                        echo json_encode(['error' => 'Erro ao atualizar status']);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Dados incompletos']);
                }
                exit;
            }
            if ($method === 'DELETE') {
                $data = json_decode(file_get_contents('php://input'), true);
                if (isset($data['id_solicitacao'])) {
                    $stmt = $db->prepare("DELETE FROM solicitacoes WHERE id_solicitacao = :id_solicitacao");
                    $stmt->bindParam(':id_solicitacao', $data['id_solicitacao']);
                    if ($stmt->execute()) {
                        http_response_code(200);
                        echo json_encode(['success' => 'Solicitação excluída com sucesso']);
                    } else {
                        http_response_code(500);
                        echo json_encode(['error' => 'Erro ao excluir solicitação']);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'ID não informado']);
                }
                exit;
            }
            http_response_code(405);
            echo json_encode(['error' => 'Metodo nao permitido']);
            break;

        default:
            http_response_code(404);
            echo json_encode([
                'error' => 'Rota inexistente no sistema EPI CHECK',
                'rota_recebida' => $route
            ]);
            break;
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'Erro interno do servidor',
        'details' => $e->getMessage()
    ]);
}
?>