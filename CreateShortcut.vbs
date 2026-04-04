' LexiLand Read - Desktop Shortcut Creator
' This script creates a desktop shortcut with the LexiLand logo

Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the current script directory
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Get desktop path
strDesktop = WshShell.SpecialFolders("Desktop")

' Create shortcut on desktop
Set objShortcut = WshShell.CreateShortcut(strDesktop & "\LexiLand Read.lnk")

' Set shortcut properties
objShortcut.TargetPath = strScriptPath & "\LexiLand.bat"
objShortcut.WorkingDirectory = strScriptPath
objShortcut.Description = "LexiLand Read - English Learning App"
objShortcut.IconLocation = strScriptPath & "\TMP\lexiland_read_logo.ico"

' Save the shortcut
objShortcut.Save

' Show success message
MsgBox "Desktop shortcut created successfully!" & vbCrLf & vbCrLf & _
       "Location: " & strDesktop & "\LexiLand Read.lnk" & vbCrLf & vbCrLf & _
       "Double-click the shortcut to launch LexiLand Read!", _
       vbInformation, "LexiLand Read"
