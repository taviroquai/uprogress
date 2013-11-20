<?php

$path   = 'data'.DIRECTORY_SEPARATOR;
$result = false;
$progress = 0;

if (!empty($_GET['filename'])) {
    if ($fh = @fopen($path.$_GET['filename'], 'a+b')) {
        $result = @fwrite($fh, file_get_contents('php://input'));
        fclose($fh);
    }
}

echo json_encode(array('result' => $result));
