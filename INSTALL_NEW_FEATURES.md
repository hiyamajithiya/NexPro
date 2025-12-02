# Quick Installation Guide for New Features

## 📦 Installing Calendar View & Reports

### Step 1: Install New Dependencies

Navigate to the frontend directory and install the required packages:

```bash
cd frontend
npm install
```

This will install:
- `react-big-calendar@^1.11.1` - For the calendar component
- `recharts@^2.12.0` - For charts and analytics

### Step 2: Verify Installation

Check that dependencies are installed:

```bash
npm list react-big-calendar recharts
```

Expected output:
```
nexca-frontend@1.0.0
├── react-big-calendar@1.11.1
└── recharts@2.12.0
```

### Step 3: Start the Application

**Terminal 1 - Backend**:
```bash
cd backend
python manage.py runserver
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm start
```

### Step 4: Access New Features

Open your browser and navigate to:
- **Application**: http://localhost:3000
- **Login** with your credentials
- **Calendar**: Click "Calendar" in the sidebar menu
- **Reports**: Click "Reports" in the sidebar menu

---

## 🔍 Verification

### Verify Calendar View:
1. Navigate to Calendar page
2. You should see a month calendar view
3. Verify toolbar has Month/Week/Day/Agenda buttons
4. Check that filters panel is visible
5. Tasks should be displayed as colored events

### Verify Reports:
1. Navigate to Reports page
2. You should see "Report Configuration" panel
3. Verify dropdown has 5 report types
4. Check that filter options are available
5. Click "Generate Report" to test

---

## 🐛 Troubleshooting

### "Module not found: react-big-calendar"

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### "Module not found: recharts"

**Solution**:
```bash
cd frontend
npm install recharts --save
```

### Calendar CSS Not Loading

**Solution**: Add to your `App.js` or `Calendar.js`:
```javascript
import 'react-big-calendar/lib/css/react-big-calendar.css';
```

This is already added in `TaskCalendar.js`, but if you see styling issues, verify the import.

### Charts Not Rendering

**Solutions**:
1. Check browser console for errors
2. Clear browser cache (Ctrl+Shift+Delete)
3. Verify recharts is installed: `npm list recharts`
4. Restart development server

### API Errors

**Backend not running**:
```bash
cd backend
python manage.py runserver
```

**Database issues**:
```bash
cd backend
python manage.py migrate
```

### Permission Issues

If you see "Permission denied" or similar:
```bash
# Windows
cd frontend
rmdir /s node_modules
npm install

# Linux/Mac
cd frontend
rm -rf node_modules
npm install
```

---

## 📊 Testing the Features

### Test Calendar:

1. **Basic Display**:
   ```
   Navigate to /calendar
   → Should show month view with tasks
   ```

2. **Filters**:
   ```
   Select Status: "Overdue"
   → Should show only overdue tasks
   ```

3. **Task Details**:
   ```
   Click on any task event
   → Dialog should open with task details
   ```

### Test Reports:

1. **Task Summary**:
   ```
   Select Report Type: "Task Summary"
   Click "Generate Report"
   → Should show summary cards and pie chart
   ```

2. **Filters**:
   ```
   Set Start Date and End Date
   Select Client
   Click "Generate Report"
   → Should show filtered results
   ```

3. **Export**:
   ```
   Generate any report
   Click "Export to CSV"
   → CSV file should download
   ```

---

## ✅ Success Checklist

After installation, verify:

- [ ] `npm install` completed without errors
- [ ] Frontend starts successfully (`npm start`)
- [ ] Backend is running (`python manage.py runserver`)
- [ ] Can navigate to Calendar page
- [ ] Calendar displays correctly
- [ ] Can navigate to Reports page
- [ ] Reports generate successfully
- [ ] CSV export works
- [ ] No console errors in browser
- [ ] No errors in terminal

---

## 📱 Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Console**:
   - Browser console (F12 → Console)
   - Backend terminal for errors

2. **Verify Setup**:
   - Node.js version: `node --version` (should be 16+)
   - Python version: `python --version` (should be 3.8+)

3. **Common Issues**:
   - Clear browser cache
   - Restart development servers
   - Reinstall node_modules
   - Check API is responding: http://localhost:8000/api/tasks/

4. **Review Documentation**:
   - FEATURES.md - Feature details
   - NEW_FEATURES_SUMMARY.md - Implementation summary
   - README.md - General setup

---

## 🚀 You're All Set!

Both Calendar View and Reports are now installed and ready to use.

**Next Steps**:
1. Explore the Calendar view with different filters
2. Generate various report types
3. Export data to CSV
4. Customize as needed for your workflow

Enjoy the new features! 🎉
