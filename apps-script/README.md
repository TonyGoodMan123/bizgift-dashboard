# Apps Script Backend

Google Apps Script backend for BizGift Dashboard.

## Setup

1. Open Google Sheets: `1b0yqNheOg0lfBqFk7duE3qA6SbjtGGFdmR_6VN_8nLg`
2. Extensions > Apps Script
3. Copy each .gs file content
4. Run `completeSetup()` function
5. Deploy > New deployment > Web app
6. Who has access: Anyone
7. Copy Web App URL

## Files

- **Config.gs** - Configuration and constants
- **Utils.gs** - Utility functions
- **API.gs** - REST API endpoints
- **Sync.gs** - Bitrix24 data synchronization
- **Setup.gs** - Initial setup wizard

## API Endpoints

- `?action=deals` - Get deals with filtering
- `?action=kpi` - Get KPI data
- `?action=managers` - Get managers list
- `?action=sync-status` - Get sync timestamps
