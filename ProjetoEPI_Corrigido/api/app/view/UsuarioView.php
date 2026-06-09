<?php
class UsuarioView{
    
    public function sendResponse($data, $statuscode){
        http_response_code($statuscode);
        echo json_encode($data);
    }
}
?>