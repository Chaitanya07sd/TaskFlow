
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
        DEPLOY_PORT = '8080'

        // Docker executable installed on this Windows machine
        DOCKER_CLI = 'C:\\Users\\HP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(
            numToKeepStr: '15',
            artifactNumToKeepStr: '5'
        ))
        disableConcurrentBuilds()
    }

    stages {

        // ---------------------------------------------------------
        // Stage 1: Checkout
        // ---------------------------------------------------------
        stage('Checkout') {
            steps {
                echo 'Stage 1: Checking out source repository...'
                checkout scm
            }
        }

        // ---------------------------------------------------------
        // Stage 2: Validate Environment
        // ---------------------------------------------------------
        stage('Validate Environment') {
            steps {
                echo 'Stage 2: Validating Java, Maven, Git and Docker...'

                bat '''
                    echo Checking Java...
                    java -version
                    if errorlevel 1 exit /b 1

                    echo Checking Maven...
                    mvn -version
                    if errorlevel 1 exit /b 1

                    echo Checking Git...
                    git --version
                    if errorlevel 1 exit /b 1

                    echo Checking Docker executable...
                    if not exist "%DOCKER_CLI%" (
                        echo Docker executable not found.
                        exit /b 1
                    )

                    "%DOCKER_CLI%" version
                    if errorlevel 1 exit /b 1

                    echo All environment checks passed.
                '''
            }
        }

        // ---------------------------------------------------------
        // Stage 3: Compile and Test Backend
        // ---------------------------------------------------------
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

        // ---------------------------------------------------------
        // Stage 4: Package Spring Boot JAR
        // ---------------------------------------------------------
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

        // ---------------------------------------------------------
        // Stage 5: Frontend Verification
        // ---------------------------------------------------------
        stage('Frontend Verification') {
            steps {
                echo 'Stage 5: Verifying frontend files...'

                bat '''
                    echo Checking frontend file structure...

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

        // ---------------------------------------------------------
        // Stage 6: Build Docker Image
        // ---------------------------------------------------------
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
                 // ---------------------------------------------------------
        // Stage 7: Verify Trivy Installation
        // ---------------------------------------------------------
        stage('Verify Trivy') {
            steps {
                echo 'Stage 7: Checking Trivy security scanner...'

                bat '''
                    "C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\AquaSecurity.Trivy_Microsoft.Winget.Source_8wekyb3d8bbwe\\trivy.exe" --version
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        // ---------------------------------------------------------
        // Deployment is intentionally not enabled yet.
        // Database credentials and health endpoint must be verified.
        // ---------------------------------------------------------
    }

    post {
        success {
            echo "SUCCESS: TaskFlow CI pipeline completed for build #${BUILD_NUMBER}."
            echo 'Backend tests, packaging, frontend verification and Docker build completed.'
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
