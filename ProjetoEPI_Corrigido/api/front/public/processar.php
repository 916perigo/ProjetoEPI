<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $item = htmlspecialchars($_POST['epi_nome'] ?? 'Não informado');
    echo "<!DOCTYPE html>
<html lang='pt-br'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <script src='https://cdn.tailwindcss.com'></script>
    <title>Pedido Enviado | EPI Check</title>
</head>
<body class='bg-[#1A1A1A] text-white flex items-center justify-center min-h-screen'>
    <div class='text-center p-8'>
        <div class='text-6xl mb-4'>✅</div>
        <h1 class='text-2xl font-bold text-yellow-400 mb-2'>Pedido enviado com sucesso!</h1>
        <p class='text-gray-400 mb-6'>Equipamento solicitado: <strong class='text-white'>$item</strong></p>
        <a href='../solicitar.html' class='text-yellow-500 underline hover:text-yellow-400'>← Voltar</a>
    </div>
</body>
</html>";
    exit;
}

header('Content-Type: application/json');
echo json_encode(['error' => 'Metodo nao permitido']);
