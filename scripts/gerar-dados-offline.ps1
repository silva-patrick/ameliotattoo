# Gera content/dados-offline.js a partir dos arquivos JSON de content/.
#
# Ao abrir o index.html direto do computador (file://), o navegador bloqueia a leitura
# de arquivos .json, mas permite carregar .js. Este arquivo e usado so nesse caso;
# o site publicado continua lendo os JSON.
#
# Roda automaticamente no GitHub (workflow "Atualizar dados offline") sempre que
# o conteudo muda. Para rodar no computador: botao direito > "Executar com o PowerShell",
# ou: powershell -ExecutionPolicy Bypass -File scripts/gerar-dados-offline.ps1
#
# (arquivo mantido sem acentos: o PowerShell 5 do Windows le scripts sem BOM como ANSI)

$ErrorActionPreference = 'Stop'
$content = Join-Path (Split-Path -Parent $PSScriptRoot) 'content'
$utf8 = New-Object System.Text.UTF8Encoding $false

$partes = foreach ($nome in 'site', 'galeria', 'depoimentos', 'avaliacoes', 'instagram') {
  $arquivo = Join-Path $content "$nome.json"
  $json = if (Test-Path $arquivo) { [IO.File]::ReadAllText($arquivo, $utf8).Trim() } else { 'null' }
  "  `"$nome`": $json"
}

$js = "// Gerado por scripts/gerar-dados-offline.ps1 - nao edite a mao.`n" +
      "window.SITE_DATA = {`n" + ($partes -join ",`n") + "`n};`n"

[IO.File]::WriteAllText((Join-Path $content 'dados-offline.js'), $js, $utf8)
Write-Host 'content/dados-offline.js atualizado.'
