<?php

class Database {
    private $host = "localhost";
    private $db_name = "controle_epi";
    private $username = "root";
    private $password = "12345678";
    private $pdo;

        public function __construct(){
            try{

                $this->pdo = new PDO("mysql:host={$this->host};dbname={$this->db_name};charset=utf8",
                $this->username,
                $this->password,
                [   
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $error){

            http_response_code(500);
            echo json_encode([
                "error" => "Falha na conexão com o banco de dados: ",
                "details" => $error->getMessage()
            ]);
            exit;
        }
    }

    public function getConnection() {
        return $this->pdo;
    }
}

?>