export const ESTILOS = `
body {
    font-family: system-ui, sans-serif;
    margin: 32px auto;
    padding: 0 20px;
    max-width: 1500px;
    background: #f5f6f8;
    color: #20242b;
}
h1, h2, h3 { color: #20242b; }

.meta, .panel {
    background: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 20px;
}

.stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
}

.stat {
    min-width: 0;
    box-sizing: border-box;
    overflow-wrap: anywhere;
    padding: 14px;
    background: #f3f4f6;
    border-radius: 9px;
}
.stat span {
    display: block;
    font-size: 14px;
    line-height: 1.35;
    overflow-wrap: anywhere;
}

.stat strong {
    display: block;
    font-size: 25px;
}

.table-wrapper { overflow-x: auto; }
table {
    width: 100%;
    border-collapse: collapse;
    white-space: nowrap;
    font-size: 14px;
}
th, td {
    padding: 10px 12px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
}
th { background: #f0f1f4; }
tr:hover { background: #f8f9fb; }

.badge {
    display: inline-block;
    border-radius: 20px;
    padding: 4px 9px;
    font-size: 12px;
    font-weight: 700;
}
.seguro { background: #d9f5e3; color: #176438; }
.dudoso { background: #fff0c2; color: #795500; }
.sin_coincidencia, .conflicto, .error {
    background: #ffe0e0;
    color: #982b2b;
}
.detail {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin: 10px 0;
}
.asignado_manualmente {
    background: #d9f5e3;
    color: #176438;
}
.omitido_manualmente {
    background: #e5e7eb;
    color: #374151;
}
.conflicto_manual,
.error_manual {
    background: #ffe0e0;
    color: #982b2b;
}
summary {
    cursor: pointer;
    padding: 14px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}
.detail-content {
    padding: 0 20px 18px;
    border-top: 1px solid #eee;
}
dl {
    display: grid;
    grid-template-columns: minmax(180px, 230px) 1fr;
    gap: 8px;
}
dt { color: #626a75; }
dd { margin: 0; font-weight: 600; }

.filters { margin-bottom: 14px; }
input, select {
    padding: 9px;
    border: 1px solid #ccc;
    border-radius: 6px;
    margin-right: 8px;
}
`;
