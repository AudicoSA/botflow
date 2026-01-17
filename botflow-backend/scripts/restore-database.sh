#!/bin/bash

###############################################################################
# BotFlow Database Restore Script
# Phase 2 Week 6 Day 7: Disaster recovery
#
# This script restores a BotFlow database backup from local storage or S3.
#
# Usage:
#   ./restore-database.sh <backup-file>
#   ./restore-database.sh botflow_backup_20260117_020000.sql.enc.gz
#   ./restore-database.sh s3://botflow-backups/daily/2026-01-17/botflow_backup_20260117_020000.sql.enc.gz
#
# WARNING: This will OVERWRITE the current database!
###############################################################################

set -e
set -u
set -o pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/botflow}"
TEMP_DIR="/tmp/botflow-restore"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
DATABASE_URL="${DATABASE_URL}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if backup file provided
if [ $# -eq 0 ]; then
    error "No backup file specified"
    echo ""
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Examples:"
    echo "  $0 botflow_backup_20260117_020000.sql.enc.gz"
    echo "  $0 /backups/botflow/botflow_backup_20260117_020000.sql.enc.gz"
    echo "  $0 s3://botflow-backups/daily/2026-01-17/botflow_backup_20260117_020000.sql.enc.gz"
    echo ""
    exit 1
fi

BACKUP_FILE=$1

# Confirmation prompt
confirm_restore() {
    warn "⚠️  WARNING: This will OVERWRITE the current database!"
    echo ""
    read -p "Are you sure you want to restore from backup? (type 'yes' to confirm): " confirmation

    if [ "${confirmation}" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi

    echo ""
    log "Starting restore process..."
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    if ! command -v psql &> /dev/null; then
        error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi

    if ! command -v gunzip &> /dev/null; then
        error "gunzip not found. Please install gzip."
        exit 1
    fi

    if ! command -v openssl &> /dev/null; then
        error "openssl not found. Please install openssl."
        exit 1
    fi

    if [ -z "${DATABASE_URL}" ]; then
        error "DATABASE_URL environment variable not set."
        exit 1
    fi

    if [ -z "${ENCRYPTION_KEY}" ]; then
        error "BACKUP_ENCRYPTION_KEY environment variable not set."
        exit 1
    fi

    log "✅ All prerequisites met"
}

# Create temp directory
create_temp_dir() {
    if [ -d "${TEMP_DIR}" ]; then
        rm -rf "${TEMP_DIR}"
    fi

    mkdir -p "${TEMP_DIR}"
    log "Created temp directory: ${TEMP_DIR}"
}

# Download backup from S3 if needed
download_backup() {
    if [[ "${BACKUP_FILE}" == s3://* ]]; then
        log "Downloading backup from S3..."

        if ! command -v aws &> /dev/null; then
            error "aws CLI not found. Cannot download from S3."
            exit 1
        fi

        LOCAL_BACKUP="${TEMP_DIR}/$(basename ${BACKUP_FILE})"

        if aws s3 cp "${BACKUP_FILE}" "${LOCAL_BACKUP}"; then
            log "✅ Backup downloaded from S3"
            BACKUP_FILE="${LOCAL_BACKUP}"
        else
            error "Failed to download backup from S3"
            exit 1
        fi
    elif [ ! -f "${BACKUP_FILE}" ]; then
        # Check if file is in BACKUP_DIR
        if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
            BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
        else
            error "Backup file not found: ${BACKUP_FILE}"
            exit 1
        fi
    fi

    log "Using backup file: ${BACKUP_FILE}"
}

# Decompress backup
decompress_backup() {
    log "Decompressing backup..."

    DECOMPRESSED_FILE="${TEMP_DIR}/$(basename ${BACKUP_FILE} .gz)"

    if gunzip -c "${BACKUP_FILE}" > "${DECOMPRESSED_FILE}"; then
        log "✅ Backup decompressed"
        BACKUP_FILE="${DECOMPRESSED_FILE}"
    else
        error "Decompression failed"
        exit 1
    fi
}

# Decrypt backup
decrypt_backup() {
    log "Decrypting backup..."

    DECRYPTED_FILE="${TEMP_DIR}/$(basename ${BACKUP_FILE} .enc)"

    if openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "${BACKUP_FILE}" \
        -out "${DECRYPTED_FILE}" \
        -pass pass:"${ENCRYPTION_KEY}"; then
        log "✅ Backup decrypted"
        BACKUP_FILE="${DECRYPTED_FILE}"
    else
        error "Decryption failed - check your encryption key"
        exit 1
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    log "Creating pre-restore backup of current database..."

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_backup_${TIMESTAMP}.sql"

    if pg_dump "${DATABASE_URL}" > "${PRE_RESTORE_BACKUP}"; then
        gzip "${PRE_RESTORE_BACKUP}"
        log "✅ Pre-restore backup created: ${PRE_RESTORE_BACKUP}.gz"
    else
        warn "Failed to create pre-restore backup - continuing anyway"
    fi
}

# Restore database
restore_database() {
    log "Restoring database..."
    log "This may take several minutes..."

    # Drop all connections to database
    log "Terminating active connections..."

    # Restore from backup
    if psql "${DATABASE_URL}" < "${BACKUP_FILE}"; then
        log "✅ Database restored successfully"
    else
        error "Database restore failed"
        log "Your pre-restore backup is available at: ${PRE_RESTORE_BACKUP}.gz"
        exit 1
    fi
}

# Verify restore
verify_restore() {
    log "Verifying restore..."

    # Check if critical tables exist
    TABLES=("organizations" "bots" "conversations" "messages" "knowledge_base_articles")

    for table in "${TABLES[@]}"; do
        if psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM ${table};" > /dev/null 2>&1; then
            log "  ✅ Table '${table}' exists"
        else
            error "Table '${table}' not found - restore may have failed"
            exit 1
        fi
    done

    log "✅ Restore verification completed"
}

# Cleanup
cleanup() {
    log "Cleaning up temporary files..."

    if [ -d "${TEMP_DIR}" ]; then
        rm -rf "${TEMP_DIR}"
        log "✅ Temporary files removed"
    fi
}

# Main execution
main() {
    log "==================================="
    log "BotFlow Database Restore Started"
    log "==================================="

    START_TIME=$(date +%s)

    confirm_restore
    check_prerequisites
    create_temp_dir
    download_backup
    decompress_backup
    decrypt_backup
    create_pre_restore_backup
    restore_database
    verify_restore
    cleanup

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    log "==================================="
    log "✅ Restore Completed Successfully"
    log "Duration: ${DURATION} seconds"
    log "==================================="
    echo ""
    log "🎉 Your database has been restored!"
    log "Pre-restore backup saved at: ${PRE_RESTORE_BACKUP}.gz"
}

# Trap errors
trap 'error "Restore failed at line $LINENO"; cleanup; exit 1' ERR

# Run main
main

exit 0
