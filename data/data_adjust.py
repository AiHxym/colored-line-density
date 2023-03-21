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
# %% 7.HellenicTrench ######################################################

# %% clean 1
# remove the line if no point in the crowded area
data = pd.read_csv(results_folder + '7.HellenicTrench_10k.csv')
all_lines = data['lineId'].unique()
reserve_lines = []
for line in all_lines:
	line_data = data[data['lineId'] == line]
	for point in line_data.to_dict('records'):
		if point['x'] > 20 and point['x'] < 25.5 and \
			point['y'] > 36:
			reserve_lines.append(line)
			break

data = data[data['lineId'].isin(reserve_lines)]
data.reset_index(drop=True, inplace=True)
data.to_csv(results_folder + '7.HellenicTrench_10k_cleaned.csv', index=False)
# %% clean 2
data = pd.read_csv(results_folder + '7.HellenicTrench_10k_cleaned.csv')
all_lines = data['lineId'].unique()
abandon_lines = []
x_range = data['x'].max() - data['x'].min()
y_range = data['y'].max() - data['y'].min()
diagonal = np.sqrt(x_range ** 2 + y_range ** 2)
	
for line in all_lines:
	line_data = data[data['lineId'] == line]
	# remove the line if the number of points is less than 10
	if len(line_data) < 10:
		abandon_lines.append(line)
		continue
	# remove the line if start-end distance is less than 10% of the diagonal
	x_dis = line_data['x'].iloc[-1] - line_data['x'].iloc[0]
	y_dis = line_data['y'].iloc[-1] - line_data['y'].iloc[0]
	dis = np.sqrt(x_dis ** 2 + y_dis ** 2)
	if dis < diagonal * 0.1:
		abandon_lines.append(line)
		continue
	# remove the line going through the selected corner area
	for point in line_data.to_dict('records'):
		if point['y'] < 34.5 or (point['x']<19 and point['y']>38 and point['y']<38.7):
			abandon_lines.append(line)
			break

data = data[~data['lineId'].isin(abandon_lines)]
data.reset_index(drop=True, inplace=True)
data.to_csv(results_folder + '7.HellenicTrench_10k_cleaned_2.csv', index=False)
# %%
