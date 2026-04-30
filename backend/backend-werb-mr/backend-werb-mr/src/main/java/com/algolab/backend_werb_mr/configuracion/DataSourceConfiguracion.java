package com.algolab.backend_werb_mr.configuracion;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import javax.sql.DataSource;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;

@Configuration
public class DataSourceConfiguracion {
    @Bean
    @Primary
    public DataSource dataSource(Environment environment) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");

        String explicitUrl = firstNonBlank(
                environment.getProperty("SPRING_DATASOURCE_URL"),
                environment.getProperty("DB_URL"));

        if (StringUtils.hasText(explicitUrl)) {
            if (esUrlPostgres(explicitUrl)) {
                configurarDesdeUrlPostgres(dataSource, explicitUrl);
                return dataSource;
            }

            dataSource.setJdbcUrl(explicitUrl);
            dataSource.setUsername(firstNonBlank(
                    environment.getProperty("SPRING_DATASOURCE_USERNAME"),
                    environment.getProperty("DB_USER"),
                    environment.getProperty("PGUSER"),
                    "postgres"));
            dataSource.setPassword(firstNonBlank(
                    environment.getProperty("SPRING_DATASOURCE_PASSWORD"),
                    environment.getProperty("DB_PASSWORD"),
                    environment.getProperty("PGPASSWORD"),
                    ""));
            return dataSource;
        }

        String railwayDatabaseUrl = firstNonBlank(
                environment.getProperty("DATABASE_PRIVATE_URL"),
                environment.getProperty("DATABASE_URL"),
                environment.getProperty("DATABASE_PUBLIC_URL"),
                environment.getProperty("POSTGRES_URL"));

        if (StringUtils.hasText(railwayDatabaseUrl)) {
            configurarDesdeUrlPostgres(dataSource, railwayDatabaseUrl);
            return dataSource;
        }

        String host = firstNonBlank(environment.getProperty("PGHOST"), "localhost");
        String port = firstNonBlank(environment.getProperty("PGPORT"), "5432");
        String database = firstNonBlank(environment.getProperty("PGDATABASE"), "postgres");
        dataSource.setJdbcUrl("jdbc:postgresql://" + host + ":" + port + "/" + database);
        dataSource.setUsername(firstNonBlank(environment.getProperty("PGUSER"), "postgres"));
        dataSource.setPassword(firstNonBlank(environment.getProperty("PGPASSWORD"), ""));

        return dataSource;
    }

    private void configurarDesdeUrlPostgres(HikariDataSource dataSource, String databaseUrl) {
        URI uri = URI.create(databaseUrl);
        String scheme = uri.getScheme();

        if (!esEsquemaPostgres(scheme)) {
            throw new IllegalArgumentException("La URL de PostgreSQL debe usar postgres:// o postgresql://");
        }

        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                .append(uri.getHost());

        if (uri.getPort() > 0) {
            jdbcUrl.append(":").append(uri.getPort());
        }

        jdbcUrl.append(uri.getPath());

        if (StringUtils.hasText(uri.getQuery())) {
            jdbcUrl.append("?").append(uri.getQuery());
        }

        dataSource.setJdbcUrl(jdbcUrl.toString());

        if (StringUtils.hasText(uri.getUserInfo())) {
            String[] userInfo = uri.getUserInfo().split(":", 2);
            dataSource.setUsername(decode(userInfo[0]));
            dataSource.setPassword(userInfo.length > 1 ? decode(userInfo[1]) : "");
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return "";
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private boolean esUrlPostgres(String value) {
        return value.startsWith("postgres://") || value.startsWith("postgresql://");
    }

    private boolean esEsquemaPostgres(String scheme) {
        return "postgres".equals(scheme) || "postgresql".equals(scheme);
    }
}
