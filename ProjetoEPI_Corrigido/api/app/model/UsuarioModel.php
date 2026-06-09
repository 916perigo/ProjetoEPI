<?php

class UsuarioModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function loginUser($email, $senha) {

        $stmt = $this->db->prepare("
            SELECT id_usuario, nome, matricula, cargo, email
            FROM usuarios
            WHERE email = :email AND senha = :senha
        ");

        $stmt->bindValue(':email', $email);
        $stmt->bindValue(':senha', $senha);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function createUser($nome, $email, $senha, $matricula, $cargo) {

        $stmt = $this->db->prepare("
            INSERT INTO usuarios(nome, matricula, cargo, email, senha)
            VALUES(:nome, :matricula, :cargo, :email, :senha)
        ");

        return $stmt->execute([
            ':nome' => $nome,
            ':matricula' => $matricula,
            ':cargo' => $cargo,
            ':email' => $email,
            ':senha' => $senha
        ]);
    }

    public function emailExiste($email) {

        $stmt = $this->db->prepare("
            SELECT id_usuario
            FROM usuarios
            WHERE email = :email
        ");

        $stmt->execute([
            ':email' => $email
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}