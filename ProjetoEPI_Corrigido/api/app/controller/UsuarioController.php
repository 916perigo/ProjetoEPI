<?php

require_once __DIR__ . '/../model/UsuarioModel.php';
require_once __DIR__ . '/../view/UsuarioView.php';

class UsuarioController {

    private $modelUsuario;
    private $viewUsuario;

    public function __construct($db) {
        $this->modelUsuario = new UsuarioModel($db);
        $this->viewUsuario = new UsuarioView();
    }

    public function loginUsuario() {

        $data = json_decode(file_get_contents('php://input'), true);

        if (isset($data['email']) && isset($data['senha'])) {

            $usuario = $this->modelUsuario->loginUser(
                $data['email'],
                $data['senha']
            );

            if ($usuario) {

                $this->viewUsuario->sendResponse([
                    'success' => 'success',
                    'message' => 'Login realizado com sucesso!',
                    'user'    => $usuario
                ], 200);

            } else {

                $this->viewUsuario->sendResponse([
                    'success' => 'error',
                    'message' => 'E-mail ou senha incorretos.'
                ], 401);
            }

        } else {

            $this->viewUsuario->sendResponse([
                'success' => 'error',
                'message' => 'Dados incompletos.'
            ], 400);
        }
    }

    public function cadastrarUsuario() {

        $data = json_decode(file_get_contents('php://input'), true);

        if (
            !isset($data['nome']) ||
            !isset($data['email']) ||
            !isset($data['senha']) ||
            !isset($data['matricula']) ||
            !isset($data['cargo'])
        ) {
            $this->viewUsuario->sendResponse([
                'success' => 'error',
                'message' => 'Dados incompletos. Preencha nome, email, senha, matrícula e cargo.'
            ], 400);
            return;
        }

        if ($this->modelUsuario->emailExiste($data['email'])) {
            $this->viewUsuario->sendResponse([
                'success' => 'error',
                'message' => 'E-mail já cadastrado.'
            ], 409);
            return;
        }

        $cadastro = $this->modelUsuario->createUser(
            $data['nome'],
            $data['email'],
            $data['senha'],
            $data['matricula'],
            $data['cargo']
        );

        if ($cadastro) {
            $this->viewUsuario->sendResponse([
                'success' => 'success',
                'message' => 'Usuário cadastrado com sucesso.'
            ], 201);
        } else {
            $this->viewUsuario->sendResponse([
                'success' => 'error',
                'message' => 'Erro ao cadastrar usuário.'
            ], 500);
        }
    }
}
