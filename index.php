<html>
<head><title>Accessing App Settings from PHP</title></head>
<body>

<h1>Hello from <?php echo getenv("CloudProvider"); ?></h1>

<ul>
<li><label>Service Bus Namespace:</label> <?php echo getenv("ServiceBusConnectionString"); ?></li> 
<li><label>Storage Connection String:</label> <?php echo getenv("StorageConnectionString"); ?>
</ul>

<p>Happy Clouding!</p>

<p><?php echo getenv("Developer"); ?></p>
</body>
</html>