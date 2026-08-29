package com.example.Panacea;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PanaceaApplication {

	public static void main(String[] args) {
		SpringApplication.run(PanaceaApplication.class, args);
	}

}
