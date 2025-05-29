function toggle_visibility(id) {
    var e = document.getElementById(id);
    
    document.getElementById('container-value').style.display = 'none';
    document.getElementById('container-file').style.display = 'none';
    document.getElementById('container-analitics').style.display = 'none';
    
    e.style.display = e.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('DOMContentLoaded', function() {
    const inputValue = document.getElementById('input-value');
    const formValue = document.getElementById('form-value');
    const valueSubmitBtn = document.getElementById('input-submit-btn');
    const resultValueData = document.getElementById('result-value-data');
    const resultContainerValue = document.getElementById('result-container-value');
    const valueError = document.getElementById('error-message-value');

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const submitFileBtn = document.getElementById('submit-file-btn');
    const resultContainerFile = document.getElementById('result-container-file');
    const resultDataFile = document.getElementById('result-data-file');
    const errorMessageFile = document.getElementById('error-message-file');
    const uploadFormFile = document.getElementById('upload-form-file');
    
    const analiticsBtn = document.getElementById('analitics-btn');
    const analiticsImageCorrTable = document.getElementById('table-correlations');
    const analiticsImagePlot = document.getElementById('plot-pred');
    const analiticsImageCorr = document.getElementById('plot-correlations');
    const selectFormPlot = document.getElementById('select-plot');
    const dropdown1 = document.getElementById("dropdown-plot-1");
    const dropdown2 = document.getElementById("dropdown-plot-2");
    const analiticsPlotBtn = document.getElementById('analitics-plot-btn');
    const errorMessageAnalitics = document.getElementById('error-message-analitics');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            fileName.textContent = this.files[0].name;
            submitFileBtn.disabled = false;
            errorMessageFile.style.display = 'none';
        } else {
            fileName.textContent = 'Файл не выбран';
            submitFileBtn.disabled = true;
        }
    });

    inputValue.addEventListener('input', function() {
        if (this.value.length > 0) {
            valueSubmitBtn.disabled = false;
            valueError.style.display = 'none';
        } else {
            valueSubmitBtn.disabled = true;
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.style.borderColor = '#3498db';
        dropArea.style.backgroundColor = '#ecf0f1';
    }

    function unhighlight() {
        dropArea.style.borderColor = '#ddd';
        dropArea.style.backgroundColor = '#fafafa';
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        
        if (files.length > 0) {
            fileName.textContent = files[0].name;
            submitFileBtn.disabled = false;
            
            const fileExt = files[0].name.split('.').pop().toLowerCase();
            if (!['csv', 'xlsx'].includes(fileExt)) {
                errorMessageFile.textContent = 'Ошибка: Неподдерживаемый формат файла. Поддерживаются только CSV и XLSX.';
                errorMessageFile.style.display = 'block';
                submitFileBtn.disabled = true;
            } else {
                errorMessageFile.style.display = 'none';
            }
        }
    }

    uploadFormFile.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!fileInput.files.length) return;
        
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        submitFileBtn.disabled = true;
        submitFileBtn.textContent = 'Обработка...';
        
        try {
            const response = await fetch('/predict_file', {
                method: 'POST',
                body: formData
            })
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
            
            const data = await response.json();
            resultDataFile.innerHTML = '';
            resultContainerFile.style.display = 'block';
            
            if (Array.isArray(data.result_model)) {
                errorMessageFile.style.display = 'none';
                resultDataFile.innerHTML = data.experience.map((exp, index) => 
                    `Стаж работы: <strong>${exp} лет</strong>, прогнозируемая зарплата: <strong>${parseInt(data.result_model[index])}₽</strong>`
                ).join('</br>');
            } else {
                resultDataFile.textContent = JSON.stringify(data, null, 2);
            }
            analiticsBtn.style.display = 'block';
            analiticsImageCorrTable.src = data.table_correlations;
            analiticsImagePlot.src = data.image_plot;

            const columns = data.plot_columns;

            columns.forEach(col => {
                const option1 = document.createElement("option");
                option1.value = col;
                option1.text = col;
                dropdown1.appendChild(option1);
        
                const option2 = document.createElement("option");
                option2.value = col;
                option2.text = col;
                dropdown2.appendChild(option2);
            });

            
        } catch (error) {
            resultContainerFile.style.display = 'none';
            errorMessageFile.textContent = `Ошибка: ${error.message}`;
            errorMessageFile.style.display = 'block';
        } finally {
            submitFileBtn.disabled = false;
            submitFileBtn.textContent = 'Получить предсказание';
        }
    });

    selectFormPlot.addEventListener('submit', async function(e) {
        e.preventDefault();

        analiticsPlotBtn.disabled = true;
        analiticsPlotBtn.textContent = 'Обработка...';
        var value1 = dropdown1.value;
        var value2 = dropdown2.value;

        file = fileInput.files[0];
        formData = new FormData();
        formData.append('file', file);
        formData.append('index', value1);
        formData.append('column', value2);
        
        try {
            const response = await fetch('/plot_correlation', {
                method: 'POST',
                body: formData
            })
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
            
            const data = await response.json();
            analiticsImageCorr.src = data.plot_by_values;
            
        } catch (error) {
            errorMessageAnalitics.textContent = `Ошибка: ${error.message}`;
            errorMessageAnalitics.style.display = 'block';
        } finally {
            analiticsPlotBtn.disabled = false;
            analiticsPlotBtn.textContent = 'Построить график';
        }
    });

    formValue.addEventListener('submit', async function(e) {
        e.preventDefault();

        valueSubmitBtn.disabled = true;
        valueSubmitBtn.textContent = 'Обработка...';
        
        try {
            const response = await fetch('/predict_value', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ "value": inputValue.value })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
            
            const data = await response.json();
            
            resultContainerValue.style.display = 'block';
            
            if (Array.isArray(data)) {
                valueError.style.display = 'none';
                resultValueData.innerHTML = `                    
                <p>При опыте <strong>${inputValue.value} лет</strong>, прогнозируемая зарплата: <strong>${parseInt(data[0])}₽</strong></p>
                `
            } else {
                valueError.style.display = 'none';
                resultValueData.textContent = JSON.stringify(data, null, 2);
            }
            
        } catch (error) {
            valueError.textContent = `Ошибка: ${error.message}`;
            valueError.style.display = 'block';
        } finally {
            valueSubmitBtn.disabled = false;
            valueSubmitBtn.textContent = 'Получить предсказание';
        }
    });
});