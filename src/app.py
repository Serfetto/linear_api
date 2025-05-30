from contextlib import asynccontextmanager
import pickle
from fastapi import BackgroundTasks, FastAPI, Form, Request, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from src.schemas import ValueSchema
from src.conf import APPLYLOADFORMATFILE
from src.utils import analitics_plot, answermodelfile, answermodelvalue, pltValues, savetempfile

LinearRegressionModel = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    global LinearRegressionModel
    with open('linear_model.pkl', 'rb') as file:
        LinearRegressionModel = pickle.load(file)
    yield
    # Clean up the ML models and release the resources
    del LinearRegressionModel

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="src/static"), name="static")
templates = Jinja2Templates(directory="src/templates")

@app.get("/")
async def main(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/predict_file")
async def get_predict(file: UploadFile, background_tasks: BackgroundTasks):
    if LinearRegressionModel is None:
        return JSONResponse(
            status_code=503,
            content={"message": f"Ой! Наша модель не работает"},
        )
    if file.content_type not in ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"]:
        return JSONResponse(
            status_code=400,
            content={"message": f"Ой! Этот файл {file.filename} имеет неверный тип, вы можете загрузить файл с типом: {', '.join(APPLYLOADFORMATFILE)}"},
        )
    
    df = await savetempfile(file, background_tasks)
    try:
        if not len(df['Years of Experience'].values.tolist()):
            return JSONResponse(
                status_code=400,
                content={"message": f"Ой! Мы не нашли никаких значений в ваших файлах. Пожалуйста, добавьте хотя бы одно значение."},
            )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"message": f"Ой! Мы не нашли нужного столбца: Years of Experience"},
        )
    
    result = answermodelfile(LinearRegressionModel, df)
    encoded_image_correlation, encoded_image_plot = analitics_plot(df, result, background_tasks)
    return JSONResponse(
        status_code=200,
        content={"experience": df['Years of Experience'].values.tolist(),
                 "result_model": result,
                 "table_correlations": f"data:image/png;base64,{encoded_image_correlation}",
                 "image_plot": f"data:image/png;base64,{encoded_image_plot}",
                 "plot_columns": df.columns.tolist(),
                }
    )

@app.post("/predict_value")
async def get_predict(value_param: ValueSchema):
    if LinearRegressionModel is None:
        return JSONResponse(
            status_code=503,
            content={"message": f"Ой! Наша модель не работает"},
        )
    if value_param.value < 0:
        return JSONResponse(
            status_code=400,
            content={"message": f"Упс! Это значение ({value_param.value}) неверно. Пожалуйста, установите значение >= 0."},
        )
    result = answermodelvalue(LinearRegressionModel, value_param.value)
    return result

@app.post("/plot_correlation")
async def get_predict(file: UploadFile, index: str = Form(...), column: str = Form(...), background_tasks: BackgroundTasks = BackgroundTasks):
    df = await savetempfile(file, background_tasks)
    if index is None or column is None:
        return JSONResponse(
            status_code=400,
            content={"message": f"Ой! Извините, вы не указали все значения. Пожалуйста, заполните все поля."},
        )
    plot_by_values = pltValues(df, index, column, background_tasks)
    return JSONResponse(
        status_code=200,
        content={"plot_by_values": f"data:image/png;base64,{plot_by_values}"},
    )
    