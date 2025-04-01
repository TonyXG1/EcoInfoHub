CREATE DATABASE ecoinfohub;

USE ecoinfohub;

CREATE TABLE
    users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(50) NOT NULL,
        isAdmin BOOLEAN NOT NULL DEFAULT 0
    );

CREATE TABLE
    posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(100) NOT NULL,
        type SMALLINT NOT NULL,
        content TEXT NOT NULL,
        creator_id INT NOT NULL,
        date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        ADD FOREIGN KEY (creator_id) REFERENCES users.id ON UPDATE CASCADE ON DELETE CASCADE
    );