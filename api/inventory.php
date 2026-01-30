<?php

include 'resources.php'
 if ($_SERVER['method'] === 'POST')
    {
        $dataToAdd = $_SERVER['body'] // if these dont work, change Server to Post
        $sqlInsert = "INSERT INTO 'resources' ('name','type','price','description') VALUES ($dataToAdd['name']
        ,$dataToAdd['type'],$dataToAdd['price'],$dataToAdd['description'])";
        $stmt = $conn->prepare($sqlInsert);
        $stmt->execute();
    }
else // this is going to pass the data from Resources to PHP to the frontend
    {
        return $data // i dont think this is how it's done but i'm sure you have a more solid idea 
    }

?>