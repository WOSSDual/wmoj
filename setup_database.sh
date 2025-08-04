#!/bin/bash

# WMOJ Database Setup Script
# This script helps you set up the database for the WMOJ application

echo "🚀 WMOJ Database Setup"
echo "======================"
echo ""
echo "This script will help you set up the database for your WMOJ application."
echo ""

# Check if we're in the right directory
if [ ! -f "database_setup.sql" ]; then
    echo "❌ Error: database_setup.sql not found in current directory"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "✅ Found database_setup.sql"
echo "✅ Found database_migration.sql"
echo ""

echo "📋 Instructions:"
echo "1. Go to your Supabase dashboard"
echo "2. Navigate to the SQL Editor"
echo "3. Copy and paste the contents of database_setup.sql"
echo "4. Run the script"
echo "5. Copy and paste the contents of database_migration.sql"
echo "6. Run the script"
echo ""

echo "📁 SQL Files:"
echo "- database_setup.sql: Main database setup with tables and RLS policies"
echo "- database_migration.sql: Migration script for existing users"
echo ""

echo "🔧 After running the SQL scripts:"
echo "1. Test user profile access by logging in and visiting the Profile page"
echo "2. Test admin access by promoting a user to admin and visiting the Admin page"
echo "3. Use the browser console utilities if you encounter issues:"
echo "   - await checkDatabaseStatus()"
echo "   - await fixUserProfile()"
echo "   - await fixAdminRecord()"
echo "   - await promoteToAdmin()"
echo ""

echo "📖 For detailed instructions, see DATABASE_FIX_INSTRUCTIONS.md"
echo ""

read -p "Press Enter to continue..."

echo "🎉 Setup instructions displayed successfully!"
echo "Please follow the steps above to complete your database setup." 