
String username = request.getParameter("username");
Statement statement = connection.createStatement();  
String query = "SELECT secret FROM Users WHERE (username = '" + username + "' AND NOT role = 'admin')";
ResultSet result = statement.executeQuery(query);