
pipeline {
    agent any

    tools {
        jdk 'JDK17'
        maven 'Maven396'
    }

    environment {
        APP_NAME = 'taskflow-backend'
        DOCKER_IMAGE = 'taskflow-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        DEPLOY_PORT = '8082'
        DEPLOY_CONTAINER = 'taskflow-app-deploy'

        DOCKER_CLI = 'C:\\Users\\HP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
    }

    options {
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(
            numToKeepStr: '15',
            artifactNumToKeepStr: '5'
        ))
        disableConcurrentBuilds()
    }

    stages {

        // Stage 1: Checkout
        stage('Checkout') {
            steps {
                echo 'Stage 1: Checking out source repository...'
                checkout scm
            }
        }

        // Stage 2: Validate Environment
        stage('Validate Environment') {
            steps {
                echo 'Stage 2: Validating Java, Maven, Git and Docker...'

                bat '''
                    java -version
                    if errorlevel 1 exit /b 1

                    mvn -version
                    if errorlevel 1 exit /b 1

                    git --version
                    if errorlevel 1 exit /b 1

                    if not exist "%DOCKER_CLI%" exit /b 1

                    "%DOCKER_CLI%" version
                    if errorlevel 1 exit /b 1

                    echo All environment checks passed.
                '''
            }
        }

        // Stage 3: Compile and Test
        stage('Compile & Test') {
            steps {
                echo 'Stage 3: Compiling and running backend tests...'

                dir('backend') {
                    bat 'mvn clean test -B'
                }
            }

            post {
                always {
                    junit(
                        testResults: 'backend/target/surefire-reports/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

        // Stage 4: Package JAR
        stage('Package JAR') {
            steps {
                echo 'Stage 4: Packaging Spring Boot application...'

                dir('backend') {
                    bat 'mvn package -DskipTests -B'
                }
            }

            post {
                success {
                    archiveArtifacts(
                        artifacts: 'backend/target/*.jar',
                        fingerprint: true
                    )
                }
            }
        }

        // Stage 5: Frontend Verification
        stage('Frontend Verification') {
            steps {
                echo 'Stage 5: Verifying frontend files...'

                bat '''
                    if not exist frontend\\index.html exit /b 1
                    if not exist frontend\\login.html exit /b 1
                    if not exist frontend\\register.html exit /b 1

                    if not exist frontend\\css\\variables.css exit /b 1
                    if not exist frontend\\css\\dashboard.css exit /b 1
                    if not exist frontend\\css\\auth.css exit /b 1

                    if not exist frontend\\js\\api.js exit /b 1
                    if not exist frontend\\js\\auth.js exit /b 1
                    if not exist frontend\\js\\dashboard.js exit /b 1

                    echo All frontend files verified successfully.
                '''
            }
        }

        // Stage 6: Build Docker Image
        stage('Build Docker Image') {
            steps {
                echo 'Stage 6: Building production Docker image...'

                bat '''
                    "%DOCKER_CLI%" build ^
                        -f backend/Dockerfile ^
                        -t "%DOCKER_IMAGE%:%DOCKER_TAG%" ^
                        -t "%DOCKER_IMAGE%:latest" .

                    if errorlevel 1 exit /b 1
                '''
            }
        }

        // Stage 7: Verify Trivy
        stage('Verify Trivy') {
            steps {
                echo 'Stage 7: Checking Trivy security scanner...'

                bat '''
                    "C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\AquaSecurity.Trivy_Microsoft.Winget.Source_8wekyb3d8bbwe\\trivy.exe" --version

                    if errorlevel 1 exit /b 1
                '''
            }
        }

        // Stage 8: Trivy Security Scan
        stage('Trivy Security Scan') {
            steps {
                echo 'Stage 8: Scanning Docker image for vulnerabilities...'

                bat '''
                    "C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\AquaSecurity.Trivy_Microsoft.Winget.Source_8wekyb3d8bbwe\\trivy.exe" image --timeout 30m --scanners vuln --severity HIGH,CRITICAL "%DOCKER_IMAGE%:%DOCKER_TAG%"

                    if errorlevel 1 exit /b 1
                '''
            }
        }

        // Stage 9: Deploy to Docker
        stage('Deploy to Docker') {
            steps {
                echo 'Stage 9: Deploying TaskFlow application...'

                script {
                    withCredentials([
                        usernamePassword(
                            credentialsId: 'taskflow-mysql',
                            usernameVariable: 'DB_USERNAME',
                            passwordVariable: 'DB_PASSWORD'
                        )
                    ]) {

                        bat '''
                            echo Removing previous deployment container if present...

                            "%DOCKER_CLI%" rm -f "%DEPLOY_CONTAINER%" 2>nul

                            echo Starting new TaskFlow deployment...

                            "%DOCKER_CLI%" run -d ^
                                --name "%DEPLOY_CONTAINER%" ^
                                --restart unless-stopped ^
                                -p "%DEPLOY_PORT%:8080" ^
                                -e DB_HOST=host.docker.internal ^
                                -e DB_PORT=3306 ^
                                -e DB_NAME=task_manager_db_boot4_test ^
                                -e DB_USERNAME ^
                                -e DB_PASSWORD ^
                                -e COOKIE_SECURE=false ^
                                "%DOCKER_IMAGE%:%DOCKER_TAG%"

                            if errorlevel 1 exit /b 1
                        '''

                        bat '''
                            echo Waiting for TaskFlow health check...

                            powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddMinutes(3); do { $status = & $env:DOCKER_CLI inspect --format='{{.State.Health.Status}}' $env:DEPLOY_CONTAINER; if ($status -eq 'healthy') { Write-Host 'TaskFlow container is healthy.'; exit 0 }; Start-Sleep -Seconds 5 } while ((Get-Date) -lt $deadline); Write-Host 'Deployment health check failed.'; & $env:DOCKER_CLI logs $env:DEPLOY_CONTAINER; exit 1"

                            if errorlevel 1 exit /b 1
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "SUCCESS: TaskFlow CI/CD pipeline completed for build #${BUILD_NUMBER}."
            echo 'All CI stages passed and Docker deployment completed.'
            echo 'Application URL: http://localhost:8082'
        }

        failure {
            echo "ERROR: TaskFlow pipeline failed in build #${BUILD_NUMBER}."
            echo 'Check the failed stage and console output.'
        }

        cleanup {
            echo 'Cleaning Jenkins workspace...'
            deleteDir()
        }
    }
}
