export const SCRIPT_FILTROS = `
const search = document.getElementById("search");
const filter = document.getElementById("filter");
const rows = [...document.querySelectorAll("#results tbody tr")];

function applyFilters() {
    const term = search.value.toLowerCase();
    const status = filter.value;

    rows.forEach((row) => {
        const matchesText = row.textContent.toLowerCase().includes(term);
        const matchesStatus =
            !status || row.children[2].textContent.trim() === status;

        row.hidden = !(matchesText && matchesStatus);
    });
}

search.addEventListener("input", applyFilters);
filter.addEventListener("change", applyFilters);
`;
