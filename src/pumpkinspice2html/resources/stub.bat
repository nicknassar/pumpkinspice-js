@ECHO OFF
if "" neq "%JAVA_HOME%" (
SET JAVA="%JAVA_HOME%\bin\java"
) else (
SET JAVA=java
)
%JAVA% -jar %0 %*
exit /b
