[Setup]
AppName=단가 비교 프로그램
AppVersion=1.0
AppPublisher=DOENC J.M
AppPublisherURL=
DefaultDirName={autopf}\DOENC\단가비교프로그램
DefaultGroupName=DOENC
OutputDir=installer_output
OutputBaseFilename=단가비교프로그램_설치파일_v1.0
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[Files]
Source: "dist\단가비교프로그램.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "doenc_logo.png"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\단가 비교 프로그램";    Filename: "{app}\단가비교프로그램.exe"
Name: "{commondesktop}\단가 비교 프로그램"; Filename: "{app}\단가비교프로그램.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "바탕화면에 바로가기 만들기"; GroupDescription: "추가 작업:"

[Run]
Filename: "{app}\단가비교프로그램.exe"; Description: "지금 바로 실행"; Flags: nowait postinstall skipifsilent
