pipeline {
    agent any

    tools {
        jdk 'Java-17'
        maven 'Maven-3'
    }

    environment {
        APP_NAME = 'taskflow-backend'
        DOCKER_IMAGE = 'taskflow-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        REGISTRY = "${env.DOCKER_REGISTRY ?: 'local'}"
        DEPLOY_PORT = '8080'
        
        // Database credentials sourced securely from Jenkins Credentials Store
        DB_HOST = "${env.DB_HOST ?: 'host.docker.internal'}"
        DB_PORT = "${env.DB_PORT ?: '3306'}"
        DB_NAME = 'task_manager_db'
        // Bind credentials securely if configured:
        // DB_CREDS = credentials('taskflow-db-credentials')
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds()
    }

    stages {
        // ---------------------------------------------------------------------
        // Stage 1: Checkout Source Code
        // ---------------------------------------------------------------------
        stage('Checkout') {
            steps {
                echo "===> Stage 1: Checking out source repository..."
                checkout scm
            }
        }

        // ---------------------------------------------------------------------
        // Stage 2: Validate Environment
        // ---------------------------------------------------------------------
        stage('Validate Environment') {
            steps {
                echo "===> Stage 2: Validating Java, Maven, Git and Docker environment..."
                sh '''
                    echo "Checking tools..."
                    java -version
                    mvn -v
                    git --version
                    docker --version || echo "Docker CLI not detected on standard agent path"
                '''
            }
        }

        // ---------------------------------------------------------------------
        // Stage 3: Compile and Test Backend
        // ---------------------------------------------------------------------
        stage('Compile & Test') {
            steps {
                echo "===> Stage 3: Running isolated backend automated test suite..."
                dir('backend') {
                    // Executes unit and integration tests against in-memory H2 DB
                    sh 'mvn clean test -B'
                }
            }
            post {
                always {
                    junit testResults: 'backend/target/surefire-reports/*.xml', allowEmptyResults: true
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 4: Package Spring Boot JAR
        // ---------------------------------------------------------------------
        stage('Package JAR') {
            steps {
                echo "===> Stage 4: Packaging production Spring Boot executable JAR..."
                dir('backend') {
                    // Packaging verifies frontend resource bundling
                    sh 'mvn package -DskipTests -B'
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'backend/target/*.jar', fingerprint: true
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 5: Frontend Verification
        // ---------------------------------------------------------------------
        stage('Frontend Verification') {
            steps {
                echo "===> Stage 5: Verifying frontend templates, styles, and scripts..."
                sh '''
                    echo "Checking frontend file structure..."
                    test -f frontend/index.html || exit 1
                    test -f frontend/login.html || exit 1
                    test -f frontend/register.html || exit 1
                    test -f frontend/css/variables.css || exit 1
                    test -f frontend/css/dashboard.css || exit 1
                    test -f frontend/css/auth.css || exit 1
                    test -f frontend/js/api.js || exit 1
                    test -f frontend/js/auth.js || exit 1
                    test -f frontend/js/dashboard.js || exit 1
                    echo "All frontend files verified successfully."
                '''
            }
        }

        // ---------------------------------------------------------------------
        // Stage 6: Build Docker Image
        // ---------------------------------------------------------------------
        stage('Build Docker Image') {
            steps {
                echo "===> Stage 6: Building multi-stage production Docker image..."
                sh """
                    docker build -f backend/Dockerfile -t ${DOCKER_IMAGE}:${DOCKER_TAG} -t ${DOCKER_IMAGE}:latest .
                """
            }
        }

        // ---------------------------------------------------------------------
        // Stage 7: Deploy Application
        // ---------------------------------------------------------------------
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo "===> Stage 7: Deploying verified container..."
                sh """
                    echo "Stopping any existing container without data loss..."
                    docker stop taskflow-app || true
                    docker rm taskflow-app || true

                    echo "Starting newly built TaskFlow container..."
                    docker run -d \\
                        --name taskflow-app \\
                        --restart unless-stopped \\
                        -p ${DEPLOY_PORT}:8080 \\
                        -e DB_HOST="${DB_HOST}" \\
                        -e DB_PORT="${DB_PORT}" \\
                        -e DB_NAME="${DB_NAME}" \\
                        --add-host host.docker.internal:host-gateway \\
                        ${DOCKER_IMAGE}:${DOCKER_TAG}
                """
            }
        }

        // ---------------------------------------------------------------------
        // Stage 8: Health Check & Smoke Verification
        // ---------------------------------------------------------------------
        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                echo "===> Stage 8: Performing post-deployment automated health check..."
                sh '''
                    echo "Waiting for Spring Boot to warm up..."
                    sleep 12
                    
                    HEALTH_STATUS=$(curl -s -f http://localhost:8080/actuator/health || echo "FAILED")
                    echo "Health check response: $HEALTH_STATUS"
                    
                    if echo "$HEALTH_STATUS" | grep -q "UP"; then
                        echo "Deployment verified! TaskFlow is UP and healthy."
                    else
                        echo "Warning: Actuator status is not UP yet. Performing retry..."
                        sleep 10
                        curl -s -f http://localhost:8080/actuator/health | grep "UP" || exit 1
                    fi
                '''
            }
        }
    }

    post {
        success {
            echo "SUCCESS: TaskFlow pipeline completed successfully for build #${BUILD_NUMBER}!"
        }
        failure {
            echo "ERROR: TaskFlow pipeline failed at stage ${env.STAGE_NAME}. Deployment aborted."
        }
        cleanup {
            cleanWs deleteDirs: true, notFailBuild: true
        }
    }
}
