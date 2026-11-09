# Spec Delta

## Purpose

Permitir executar e visualizar o aplicativo móvel Garagem em Dia de forma independente, com um ciclo de desenvolvimento local reproduzível e opção de servidor em contêiner.

## ADDED Requirements

### Requirement: Independent mobile startup
The mobile application SHALL open an initial screen identifying Garagem em Dia without requiring authentication, the web application, or an available backend.

#### Scenario: Open the initial application
- **WHEN** a developer launches the installed development application on a supported Android emulator with its development server running and the backend stopped
- **THEN** the screen displays "Garagem em Dia" and "Aplicativo em desenvolvimento" without a runtime error or a request to the backend

### Requirement: Reproducible development environment
The project SHALL provide documented commands and locked compatible stable dependencies to install and start the mobile application independently from the web application.

#### Scenario: Clean setup
- **WHEN** a developer follows the documented prerequisites and installation commands from a clean checkout
- **THEN** dependencies install from the committed lockfile and the application can be started without installing the web application's dependencies

### Requirement: Containerized development server
The project SHALL provide an explicitly enabled container configuration that serves the mobile application to an emulator running on the host, without starting backend services or altering the default web deployment.

#### Scenario: Run development server in Docker
- **WHEN** a developer runs the documented mobile-only Compose command and connects the installed development application through the documented host connection
- **THEN** the initial screen opens using the container's development server without API secrets or running backend services

#### Scenario: Default deployment
- **WHEN** a developer uses the existing Compose commands without the additional mobile configuration
- **THEN** no mobile development service starts and the existing services retain their configuration

### Requirement: Visible edit feedback
The development workflow SHALL show source edits in the running application for both direct and containerized development servers without rebuilding the native application for a text-only change.

#### Scenario: Edit initial screen text
- **WHEN** a developer changes the initial screen text while the application is connected to either supported development-server mode
- **THEN** the updated text becomes visible through development refresh and no native rebuild is required

### Requirement: Documented device setup
The project SHALL document Android emulator setup on Windows through a graphical installer and a command-line alternative, connection troubleshooting, physical-device alternatives, and the macOS requirement for a local iOS simulator.

#### Scenario: Choose a local emulator
- **WHEN** a Windows developer follows the recommended Android setup instructions
- **THEN** they can create and start a virtual device, verify device detection, install the development application, and connect it to the chosen development-server mode

#### Scenario: Select iOS testing
- **WHEN** a developer reads the iOS instructions on Windows
- **THEN** the instructions explain that local iOS simulation requires a Mac and distinguish physical-device or remote testing from local emulation
