// CodeVi/Jenkinsfile
pipeline {
    agent any

    environment {
        // 실제 폴더명으로 확인해 주세요! (하이픈 유무 등)
        BACK_DIR = "code-vi-back"
        FRONT_DIR = "code-vi-front"
    }

    stages {
        stage('Checkout') {
            steps {
                // GitHub에서 소스 코드를 전체적으로 긁어옵니다.
                checkout scm
            }
        }

        stage('Build & Deploy (In Parallel)') {
            parallel {
                // 1. 백엔드 빌드 및 배포
                stage('Backend CD') {
                    steps {
                        dir("${BACK_DIR}") {
                            echo "🚀 Starting Backend Deployment..."
                            // 각 폴더 내부의 docker-compose.prod.yml을 사용합니다.
                            sh "docker-compose -f docker-compose.prod.yml up -d --build"
                        }
                    }
                }

                // 2. 프론트엔드 빌드 및 배포
                stage('Frontend CD') {
                    steps {
                        dir("${FRONT_DIR}") {
                            echo "🎨 Starting Frontend Deployment..."
                            sh "docker-compose -f docker-compose.prod.yml up -d --build"
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ All services (Front & Back) deployed successfully!"
        }
        failure {
            echo "❌ Deployment failed. Please check the logs."
        }
    }
}
