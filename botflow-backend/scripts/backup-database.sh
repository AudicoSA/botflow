#!/bin/bash

###############################################################################
# BotFlow Database Backup Script
# Phase 2 Week 6 Day 7: Automated backups and disaster recovery
#
# This script creates encrypted backups of the BotFlow database and uploads
# them to S3-compatible storage for disaster recovery.
#
# Usage:
#   ./backup-database.sh
#
# Schedule with cron:
#   0 2 * * * /path/to/backup-database.sh >> /var/log/botflow-backup.log 2>&1
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/botflow}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-botflow-backups}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# Database connection (from environment)
DATABASE_URL="${DATABASE_URL}"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="botflow_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if pg_dump is installed
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Check if gzip is installed
    if ! command -v gzip &> /dev/null; then
        error "gzip not found. Please install gzip."
        exit 1
    fi

    # Check if openssl is installed (for encryption)
    if ! command -v openssl &> /dev/null; then
        error "openssl not found. Please install openssl."
        exit 1
    fi

    # Check if aws CLI is installed (for S3 upload)
    if ! command -v aws &> /dev/null; then
        warn "aws CLI not found. S3 upload will be skipped."
    fi

    # Check if DATABASE_URL is set
    if [ -z "${DATABASE_URL}" ]; then
        error "DATABASE_URL environment variable not set."
        exit 1
    fi

    # Check if ENCRYPTION_KEY is set
    if [ -z "${ENCRYPTION_KEY}" ]; then
        error "BACKUP_ENCRYPTION_KEY environment variable not set."
        exit 1
    fi

    log "✅ All prerequisites met"
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "${BACKUP_DIR}" ]; then
        log "Creating backup directory: ${BACKUP_DIR}"
        mkdir -p "${BACKUP_DIR}"
    fi
}

# Create database backup
create_backup() {
    log "Starting database backup..."
    log "Backup file: ${BACKUP_PATH}"

    # Run pg_dump
    if pg_dump "${DATABASE_URL}" > "${BACKUP_PATH}"; then
        log "✅ Database dump completed"
    else
        error "Database dump failed"
        exit 1
    fi

    # Get backup size
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
    log "Backup size: ${BACKUP_SIZE}"
}

# Encrypt backup
encrypt_backup() {
    log "Encrypting backup..."

    # Encrypt with AES-256-CBC
    if openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "${BACKUP_PATH}" \
        -out "${BACKUP_PATH}.enc" \
        -pass pass:"${ENCRYPTION_KEY}"; then
        log "✅ Backup encrypted"

        # Remove unencrypted backup
        rm "${BACKUP_PATH}"
        BACKUP_PATH="${BACKUP_PATH}.enc"
    else
        error "Encryption failed"
        exit 1
    fi
}

# Compress backup
compress_backup() {
    log "Compressing backup..."

    if gzip -9 "${BACKUP_PATH}"; then
        log "✅ Backup compressed"
        BACKUP_PATH="${BACKUP_PATH}.gz"
    else
        error "Compression failed"
        exit 1
    fi

    # Get compressed size
    COMPRESSED_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
    log "Compressed size: ${COMPRESSED_SIZE}"
}

# Upload to S3
upload_to_s3() {
    if command -v aws &> /dev/null; then
        log "Uploading to S3: ${S3_BUCKET}/${DATE}/${BACKUP_FILE}.enc.gz"

        if aws s3 cp "${BACKUP_PATH}" \
            "s3://${S3_BUCKET}/daily/${DATE}/${BACKUP_FILE}.enc.gz" \
            --storage-class STANDARD_IA; then
            log "✅ Backup uploaded to S3"
        else
            error "S3 upload failed"
            # Don't exit - local backup still exists
        fi
    else
        warn "Skipping S3 upload (aws CLI not available)"
    fi
}

# Clean old backups
clean_old_backups() {
    log "Cleaning backups older than ${RETENTION_DAYS} days..."

    # Count files before cleanup
    OLD_COUNT=$(find "${BACKUP_DIR}" -name "botflow_backup_*.sql.enc.gz" -type f | wc -l)

    # Delete old local backups
    find "${BACKUP_DIR}" -name "botflow_backup_*.sql.enc.gz" \
        -type f -mtime +${RETENTION_DAYS} -delete

    # Count files after cleanup
    NEW_COUNT=$(find "${BACKUP_DIR}" -name "botflow_backup_*.sql.enc.gz" -type f | wc -l)
    DELETED=$((OLD_COUNT - NEW_COUNT))

    if [ ${DELETED} -gt 0 ]; then
        log "🗑️  Deleted ${DELETED} old backup(s)"
    else
        log "No old backups to delete"
    fi

    # Clean old S3 backups
    if command -v aws &> /dev/null; then
        log "Cleaning old S3 backups..."
        CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d)

        # Note: This requires aws CLI with appropriate permissions
        # aws s3 ls "s3://${S3_BUCKET}/daily/" | while read -r line; do
        #     # Parse date from S3 path and delete if older than cutoff
        # done
    fi
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."

    if [ -f "${BACKUP_PATH}" ]; then
        # Check if file is not empty
        if [ -s "${BACKUP_PATH}" ]; then
            # Test gzip integrity
            if gzip -t "${BACKUP_PATH}"; then
                log "✅ Backup integrity verified"
            else
                error "Backup file is corrupted"
                exit 1
            fi
        else
            error "Backup file is empty"
            exit 1
        fi
    else
        error "Backup file not found: ${BACKUP_PATH}"
        exit 1
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    # TODO: Implement notification (email, Slack, etc.)
    # For now, just log
    if [ "${status}" = "success" ]; then
        log "✅ ${message}"
    else
        error "❌ ${message}"
    fi
}

# Calculate backup statistics
calculate_stats() {
    log "Backup Statistics:"
    log "  - Backup file: ${BACKUP_FILE}.enc.gz"
    log "  - Location: ${BACKUP_PATH}"
    log "  - Size: ${COMPRESSED_SIZE}"
    log "  - Retention: ${RETENTION_DAYS} days"
    log "  - Total local backups: $(find "${BACKUP_DIR}" -name "botflow_backup_*.sql.enc.gz" -type f | wc -l)"
}

# Main execution
main() {
    log "==================================="
    log "BotFlow Database Backup Started"
    log "==================================="

    START_TIME=$(date +%s)

    # Execute backup steps
    check_prerequisites
    create_backup_dir
    create_backup
    encrypt_backup
    compress_backup
    verify_backup
    upload_to_s3
    clean_old_backups
    calculate_stats

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    log "==================================="
    log "✅ Backup Completed Successfully"
    log "Duration: ${DURATION} seconds"
    log "==================================="

    send_notification "success" "Database backup completed successfully"
}

# Trap errors
trap 'error "Backup failed at line $LINENO"; send_notification "failure" "Database backup failed"; exit 1' ERR

# Run main function
main

exit 0
