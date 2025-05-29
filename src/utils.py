import base64
import os
from pathlib import Path
import tempfile
import uuid
from fastapi import BackgroundTasks, UploadFile
from matplotlib import pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
import seaborn as sns

async def savetempfile(file: UploadFile, background_tasks: BackgroundTasks):
    extentionFile = file.filename.split(".")[-1]

    if extentionFile == "csv":
        df = pd.read_csv(file.file)
    elif extentionFile == "xlsx":
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        df = pd.read_excel(tmp_path)
        background_tasks.add_task(os.unlink, tmp_path)

    return df

def answermodelfile(model: LinearRegression, df: pd.DataFrame):
    return model.predict(df['Years of Experience'].to_numpy().reshape(-1,1)).tolist()

def answermodelvalue(model: LinearRegression, value: int):
    return model.predict([[value]]).tolist()

def path_with_uuid():
    return Path("src/static/media") / f"{uuid.uuid4()}.png"

def encode_delete_file(plot_file: Path):
    with open(plot_file, "rb") as image:
        encoded_image = base64.b64encode(image.read()).decode('utf-8')
    return encoded_image

def plot(df: pd.DataFrame=None, 
         column1: str = None, 
         column2: str = None, 
         pred_model: list[int] = None, 
         title: str = None,
         plot_file: Path = None, 
         legend: bool = False,
         trendline: bool = False):
    if column1 is not None and column2 is not None:
        plt.scatter(df[column1].to_numpy(), df[column2].to_numpy(), color='red')
    if column1 is not None:
        plt.xlabel(column1)
    if column2 is not None:
        plt.ylabel(column2)
    if pred_model is not None:
        plt.plot(df[column1].to_numpy(), np.array(pred_model), color='blue', linewidth=2)
    if title is not None:
        plt.title(title)
    # if legend:
    #     plt.legend([column2, column1], loc='upper left')
    if trendline:
        plt.plot(np.unique(df[column1].to_numpy()), 
         np.poly1d(np.polyfit(df[column1].to_numpy(), df[column2].to_numpy(), 1))
         (np.unique(df[column1].to_numpy())), color='blue')
    plt.savefig(plot_file, bbox_inches='tight', dpi=300)
    plt.close()

def pltValues(df: pd.DataFrame, index: str, column: str, background_tasks: BackgroundTasks):
    plot_file = path_with_uuid()
    plot(df=df, column1=index, column2=column, title="Корреляция признаков", plot_file=plot_file, trendline=True)
    encoded_image = encode_delete_file(plot_file)
    background_tasks.add_task(os.remove, plot_file)
    return encoded_image
    
def analitics_plot(df: pd.DataFrame, pred_model: list[int], background_tasks: BackgroundTasks):
    table_correlation_file = path_with_uuid()
    plot_file = path_with_uuid()

    co_mtx = df.corr(numeric_only=True)
    sns.heatmap(co_mtx, cmap="YlGnBu", annot=True)
    plt.title("Корреляционная матрица")
    plt.savefig(table_correlation_file, bbox_inches='tight', dpi=300)
    plt.close()

    plot(df=df, column1="Years of Experience", column2="Salary", pred_model=pred_model, title="Предсказание заработной платы", plot_file=plot_file)

    encoded_image_correlation = encode_delete_file(table_correlation_file)
    encoded_image_plot = encode_delete_file(plot_file)
    
    background_tasks.add_task(os.remove, table_correlation_file)
    background_tasks.add_task(os.remove, plot_file)
    return encoded_image_correlation, encoded_image_plot
