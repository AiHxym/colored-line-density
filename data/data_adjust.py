#%% imports
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import json
from tqdm import tqdm
from utils import *

results_folder = './cleaned_data/'

# %% AIS China #############################################################

data = pd.read_csv(results_folder + 'AIS_China_1800.csv')
# data['time'] = pd.to_datetime(data['time'], unit='s')

# sort by lineId and time
data = data.sort_values(by=['lineId', 'time'])

# #%% seperate the line if the time gap is larger than 1 hour
# data['time_gap'] = data.groupby('lineId')['time'].diff()
# data['time_gap'] = data['time_gap'].fillna(0)
# data['time_gap'] = data['time_gap'].apply(lambda x: 1 if x > 3600 else 0)
# data['lineId'] = data['lineId'] + data['time_gap'].cumsum()

# seperate the line if the pos gap is larger than 5%
# range of x and y
x_min = data['x'].min()
x_max = data['x'].max()
y_min = data['y'].min()
y_max = data['y'].max()

data['x_gap'] = data.groupby('lineId')['x'].diff()
data['x_gap'] = data['x_gap'].fillna(0)
data['x_gap'] = data['x_gap'].apply(lambda x: 1 if x > (x_max - x_min) * 0.05 else 0)
data['lineId'] = data['lineId'] + data['x_gap'].cumsum()

data['y_gap'] = data.groupby('lineId')['y'].diff()
data['y_gap'] = data['y_gap'].fillna(0)
data['y_gap'] = data['y_gap'].apply(lambda x: 1 if x > (y_max - y_min) * 0.05 else 0)
data['lineId'] = data['lineId'] + data['y_gap'].cumsum()

data.to_csv(results_folder + 'AIS_China_1800_cleaned.csv', index=False)

# %% MarineCadastre #######################################################
data = pd.read_csv(results_folder + 'MarineCadastre_2022_01_03.csv')

# sort by lineId and time
data = data.sort_values(by=['lineId', 'time'])

# seperate the line if the pos gap is larger than 5%
# range of x and y
x_min = data['x'].min()
x_max = data['x'].max()
y_min = data['y'].min()
y_max = data['y'].max()

data['x_gap'] = data.groupby('lineId')['x'].diff()
data['x_gap'] = data['x_gap'].fillna(0)
data['x_gap'] = data['x_gap'].apply(lambda x: 1 if x > (x_max - x_min) * 0.05 else 0)
data['lineId'] = data['lineId'] + data['x_gap'].cumsum()

data['y_gap'] = data.groupby('lineId')['y'].diff()
data['y_gap'] = data['y_gap'].fillna(0)
data['y_gap'] = data['y_gap'].apply(lambda x: 1 if x > (y_max - y_min) * 0.05 else 0)
data['lineId'] = data['lineId'] + data['y_gap'].cumsum()

data.to_csv(results_folder + 'MarineCadastre_2022_01_03_cleaned.csv', index=False)


# %% T-Dirve ##############################################################

data = pd.read_csv(results_folder + 'T-Drive_5ring_5.csv')

# set lineId to string
data['lineId'] = data['lineId'].astype(str)

# sort by lineId and time
data = data.sort_values(by=['lineId', 'time'])

# range of x and y
x_min = data['x'].min()
x_max = data['x'].max()
y_min = data['y'].min()
y_max = data['y'].max()
# 5% of the range, by euclidean distance
threshold = 0.05 * np.sqrt((x_max - x_min) ** 2 + (y_max - y_min) ** 2)

# seperate the line if the pos gap is larger than 5%
data['x_gap'] = data.groupby('lineId')['x'].diff()
data['x_gap'] = data['x_gap'].fillna(0)
data['y_gap'] = data.groupby('lineId')['y'].diff()
data['y_gap'] = data['y_gap'].fillna(0)
data['pos_gap'] = np.sqrt(data['x_gap'] ** 2 + data['y_gap'] ** 2)
data['pos_gap'] = data['pos_gap'].apply(lambda x: 1 if x > threshold else 0)
data['lineId'] = data['lineId'] + '-' + data['pos_gap'].cumsum().astype(str)

# data = data[['lineId', 'time', 'x', 'y']]
data.to_csv(results_folder + 'T-Drive_5ring_5_cleaned.csv', index=False)

# %%
df = pd.read_csv(results_folder + 'MarineCadastre_Atlantic_2018.csv')
print(df['x'].min(), df['x'].max())
print(df['y'].min(), df['y'].max())
# lng 15.090720000000031 45.51913000000008
# lat -83.99999999999994 -59.99999999999994
# %%
df = pd.read_csv(results_folder + 'MarineCadastre_GulfOfMexico_2018.csv')
print(df['x'].min(), df['x'].max())
print(df['y'].min(), df['y'].max())
# lng 17.004000000000076 34.09868000000006
# lat -97.94371999999998 -83.99999999999994
# %%
