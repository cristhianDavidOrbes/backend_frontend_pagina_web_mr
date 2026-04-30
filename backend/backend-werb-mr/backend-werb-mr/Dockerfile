FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace

COPY backend/backend-werb-mr/backend-werb-mr/gradlew .
COPY backend/backend-werb-mr/backend-werb-mr/gradle ./gradle
COPY backend/backend-werb-mr/backend-werb-mr/build.gradle .
COPY backend/backend-werb-mr/backend-werb-mr/settings.gradle .
COPY backend/backend-werb-mr/backend-werb-mr/src ./src

RUN chmod +x gradlew && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /workspace/build/libs/backend-werb-mr-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

CMD ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
