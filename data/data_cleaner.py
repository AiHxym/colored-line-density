#%% imports
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import json
from tqdm import tqdm
from utils import *

results_folder = './cleaned_data/'
## longitude -> x
## latitude -> y

##########################################################################
# %% 1. T-Drive #############################################################

# Structure
# 0: taxi ID
# 1: time (string, format: yyyy-mm-dd hh:mm:ss)
# 2: longitude
# 3: latitude
# time range: 2008-02-02 00:00:00 to 2008-02-08 23:59:59

file_folder = './T-Drive Trajectory Dataset/taxi_log_2008_by_id/'
taxi_files = list_dir(file_folder)

all_data = []

# sample randomly 
num_sample = 500
if num_sample:
	taxi_files = np.random.choice(taxi_files, num_sample, replace=False)

for file in tqdm(taxi_files):
	file_path = file_folder + file
	data = pd.read_csv(file_path, header=None, 
						names=['lineId', 'time', 'x', 'y'])
	# remove duplicated points
	data = data.drop_duplicates()
	# if there is time out of range, alert
	data['time'] = pd.to_datetime(data['time'])
	if data['time'].min() < pd.to_datetime('2008-02-02 00:00:00') or \
			data['time'].max() > pd.to_datetime('2008-02-08 23:59:59'):
		print('Time out of range!')
		print(data['time'].min())
		print(data['time'].max())
		exit()
	# data['time'] = data['time'] - pd.to_datetime('2008-02-02 00:00:00')
	# data['time'] = max_min_normalize(data['time'])
	data['time'] = data['time'].apply(lambda x: x.timestamp())
	# lineID, time, x, y
	data = data[['lineId', 'time', 'x', 'y']]
	all_data.append(data)

all_data = pd.concat(all_data)
### constrain x y range
# remove the points with x out of [116.1, 116.6]
all_data = all_data[all_data['x'] > 116.1]
all_data = all_data[all_data['x'] < 116.6]
# remove the points with y out of [39.7, 40.1]
all_data = all_data[all_data['y'] > 39.7]
all_data = all_data[all_data['y'] < 40.1]
# all_data.to_csv('./all_data_5ring.csv', index=False)

# sort by lineID and time
all_data = all_data.sort_values(by=['lineId', 'time'])
all_data['lineId'] = all_data['lineId'].astype(str)

# calculate the diagonal distance of the canvas
x_range = all_data['x'].max() - all_data['x'].min()
y_range = all_data['y'].max() - all_data['y'].min()
diag = np.sqrt(x_range**2 + y_range**2)

# seperate the line if the position gap is larger than 10% of the diagonal
threshold = diag * 0.1
all_data.reset_index(drop=True, inplace=True)
all_data['x_gap'] = all_data.groupby('lineId')['x'].diff()
all_data['x_gap'] = all_data['x_gap'].fillna(0)
all_data['y_gap'] = all_data.groupby('lineId')['y'].diff()
all_data['y_gap'] = all_data['y_gap'].fillna(0)
all_data['pos_gap'] = np.sqrt(all_data['x_gap']**2 + all_data['y_gap']**2)
all_data['too_far'] = all_data['pos_gap'].apply(lambda x: 1 if x > threshold else 0)
all_data['lineId2'] = all_data['lineId'] + '-' + all_data['too_far'].cumsum().astype(str)

# save
if num_sample: suffix = '_%d' % (num_sample)
else: suffix = '_all'
data_original = all_data[['lineId', 'time', 'x', 'y']]
data_cleaned = all_data[['lineId2', 'time', 'x', 'y']]
data_cleaned.columns = ['lineId', 'time', 'x', 'y']
data_original.to_csv(results_folder + 'T-Drive' + suffix + '.csv', index=False)
data_cleaned.to_csv( results_folder + 'T-Drive' + suffix + '_cleaned.csv', index=False)

##########################################################################
# %% 2. NOAA Hurricane Data #################################################

# Structure
# {"type", "name", "cors",
# 	"features": { 
# 		"type",
# 		"properties": {
#		 	"OBJECTID",
#		 	"Serial_Num",
#		 	"ISO_time",
# 		}
# 		"geometry": {
# 			"coordinates": [ [lon1, lat1], [lon2, lat2] ]
# 		}
# 	}
# }

all_data = []

file = './NOAA Historic Hurricane Tracks & Points/NOAA_Historic_Hurricane_Tracks_%26_Points.geojson'
data = json.load(open(file, 'r'))
data = data['features']

for record in tqdm(data):
	# no idea what is MultiLineString
	if record['geometry']['type'] != 'LineString':
		continue
	# lineID, time, x, y
	lineId = record['properties']['Serial_Num']
	time = pd.to_datetime(record['properties']['ISO_time'])
	x1 = record['geometry']['coordinates'][0][0]
	y1 = record['geometry']['coordinates'][0][1]
	x2 = record['geometry']['coordinates'][1][0]
	y2 = record['geometry']['coordinates'][1][1]
	x = cal_longtitue_center(x1, x2)
	y = (y1 + y2) / 2
	# all_data.append([lineId, time, x1, y1, x2, y2])
	all_data.append([lineId, time, x, y])

# all_data = pd.DataFrame(all_data, columns=['lineId', 'time', 'x1', 'y1', 'x2', 'y2'])
all_data = pd.DataFrame(all_data, columns=['lineId', 'time', 'x', 'y'])
all_data['time'] = max_min_normalize(all_data['time'])


### move the longitude range to a contineous space
### [-180, 15]+[100, 180] -> [0, 360]
all_data['x'] = all_data['x'].apply(lambda x: x+360 if x < 15 else x)
all_data['x'] = all_data['x'] - 100

all_data.to_csv(results_folder + 'hurricane.csv', index=False)


##########################################################################
# %% 3. AIS China coastal waters ##########################################

# Structure
# test: 渔船ID,lat,lon,速度,方向,time
# train: 渔船ID,lat,lon,速度,方向,time,type

data_folder	= './AIS-China coastal waters/'
train_files	= list_dir(data_folder + 'train/')
train_files	= ['train/' + file for file in train_files]
test_files	= list_dir(data_folder + 'test/')
test_files	= ['test/' + file for file in test_files]
all_files	= train_files + test_files

# sample data
num_sample = 2000
if num_sample:
	all_files = np.random.choice(all_files, num_sample, replace=False)

all_data = []

for file in tqdm(all_files):
	file_path = data_folder + file
	data = pd.read_csv(file_path,
		    			skiprows=1,
		    			keep_default_na=False,
						usecols=[0, 1, 2, 5],
						names=['lineId', 'y', 'x', 'time'])
	data.dropna(inplace=True)
	data.drop_duplicates(inplace=True)
	data['time'] = pd.to_datetime(data['time'])
	# lineID, time, x, y
	data = data[['lineId', 'time', 'x', 'y']]
	all_data.append(data)

all_data = pd.concat(all_data)

# all_data['time'] = max_min_normalize(all_data['time'])

all_data['lineId'] = all_data['lineId'].astype(str)
all_data['time'] = all_data['time'].apply(lambda x: x.timestamp())
all_data = all_data.sort_values(by=['lineId', 'time'])

# calculate the diagonal distance of the canvas
x_range = all_data['x'].max() - all_data['x'].min()
y_range = all_data['y'].max() - all_data['y'].min()
diag = np.sqrt(x_range**2 + y_range**2)

# seperate the line if the position gap is larger than 10% of the diagonal
threshold = diag * 0.1
all_data.reset_index(drop=True, inplace=True)
all_data['x_gap'] = all_data.groupby('lineId')['x'].diff()
all_data['x_gap'] = all_data['x_gap'].fillna(0)
all_data['y_gap'] = all_data.groupby('lineId')['y'].diff()
all_data['y_gap'] = all_data['y_gap'].fillna(0)
all_data['pos_gap'] = np.sqrt(all_data['x_gap']**2 + all_data['y_gap']**2)
all_data['too_far'] = all_data['pos_gap'].apply(lambda x: 1 if x > threshold else 0)
all_data['lineId2'] = all_data['lineId'] + '-' + all_data['too_far'].cumsum().astype(str)

# save
if num_sample: suffix = '_%d' % (num_sample)
else: suffix = '_all'
data_original = all_data[['lineId', 'time', 'x', 'y']]
data_cleaned = all_data[['lineId2', 'time', 'x', 'y']]
data_cleaned.columns = ['lineId', 'time', 'x', 'y']
data_original.to_csv(results_folder + 'AIS_China' + suffix + '.csv', index=False)
data_cleaned.to_csv( results_folder + 'AIS_China' + suffix + '_cleaned.csv', index=False)

##########################################################################
# %% 4. 128_fishing_trajectories ############################################

# Structure
# id,t,longitude,latitude,x,y,signed_turn,bearing,time_gap,distance_gap,euc_speed,distanceToShore,label

data_file = './128_fishing_trajs/128_fishing_trajs.csv'

data = pd.read_csv(data_file,
					keep_default_na=False,
					skiprows=1,
					usecols=[0, 1, 2, 3],
					names=['lineId', 'time', 'x', 'y'])

data['time'] = pd.to_datetime(data['time'])
data['time'] = max_min_normalize(data['time'])

data.to_csv(results_folder + '128_fishing_trajs.csv', index=False)

##########################################################################

# %% 5. AIS maritime data ###################################################

# Structure
# cog, sog, beam, callsign, cargo, heading, ...

import pickle
data = pickle.load(open('./5.AIS maritime data/merged_ais_data_1618929435192.pkl', 'rb'))
data = data[['callsign', 'timeoffix', 'longitude', 'latitude']]
data.columns = ['lineId', 'time', 'x', 'y']
print(data.shape)
data = data.dropna()	# remove rows with NaN values
print(data.shape)

# %%
# count the number of rows for each lineId
lineId_count = data.groupby('lineId').size().reset_index(name='counts')
print(lineId_count.min())	# 1
print(lineId_count.max())	# 55309
print(lineId_count.mean())	# 559.44
# count the number of lineId with more than 100 rows
print(lineId_count.shape[0])	# 31231
print(lineId_count[lineId_count['counts'] > 10].shape[0])	# 2351
print(lineId_count[lineId_count['counts'] > 100].shape[0])	# 2162
print(lineId_count[lineId_count['counts'] > 5000].shape[0])	# 1141
print(lineId_count[lineId_count['counts'] > 100][lineId_count['counts'] < 5000].shape[0])	# 1021

# %%
# remove lineId with less than 100 rows and more than 5000 rows
lineId_count = lineId_count[lineId_count['counts'] > 100]
lineId_count = lineId_count[lineId_count['counts'] < 5000]
lineId_count = lineId_count['lineId'].tolist()
data = data[data['lineId'].isin(lineId_count)]

# %% time
# iterate over the rows and convert each element to timestamp
for i, row in tqdm(data.iterrows()):
	if isinstance(row['time'], str):
		data.at[i, 'time'] = pd.to_datetime(row['time'])
	elif isinstance(row['time'], int):
		data.at[i, 'time'] = pd.to_datetime(row['time'], unit='s')

data['time'] = data['time'].apply(lambda x: x.timestamp())
# data['time'] = max_min_normalize(data['time'])

#%% seperate the line 
data['lineId'] = data['lineId'].astype(str)
data = data.sort_values(by=['lineId', 'time'])	# sort by lineId and time, so that position gap can be calculated

#%% by time gap
# look at the time gap distribution
data.reset_index(drop=True, inplace=True)
data['time_gap'] = data.groupby('lineId')['time'].diff()
data['time_gap'] = data['time_gap'].fillna(0)
plt.hist(data['time_gap'])
# seperate the line if time gap is larger than 1 hour
data['too_late'] = data['time_gap'].apply(lambda x: 1 if x > 3600 else 0)
data['lineId2'] = data['lineId'] + '-' + data['too_late'].cumsum().astype(str)

#%% by position gap
# the position gap distribution
data.reset_index(drop=True, inplace=True)
data['x_gap'] = data.groupby('lineId')['x'].diff()
data['x_gap'] = data['x_gap'].fillna(0)
data['y_gap'] = data.groupby('lineId')['y'].diff()
data['y_gap'] = data['y_gap'].fillna(0)
data['pos_gap'] = np.sqrt(data['x_gap']**2 + data['y_gap']**2)
# diagnonal
x_range = data['x'].max() - data['x'].min()
y_range = data['y'].max() - data['y'].min()
diag = np.sqrt(x_range**2 + y_range**2)
threshold = diag * 0.1
# seperate the line if position gap is larger than 10% of the diagonal
data['too_far'] = data['pos_gap'].apply(lambda x: 1 if x > threshold else 0)
data['lineId3'] = data['lineId'] + '-' + data['too_far'].cumsum().astype(str)

#%% remove rows with x, y out of range
data = data[data['x'] > -30]
data = data[data['x'] < 30]
data = data[data['y'] > 50]
data = data[data['y'] < 75]

#%% save
data_original = data[['lineId', 'time', 'x', 'y']]
data_original.to_csv(results_folder + 'AIS_maritime_data.csv', index=False)
data_time = data[['lineId2', 'time', 'x', 'y']]
data_time.columns = ['lineId', 'time', 'x', 'y']
data_time.to_csv(results_folder + 'AIS_maritime_data_de_late.csv', index=False)
data_pos = data[['lineId3', 'time', 'x', 'y']]
data_pos.columns = ['lineId', 'time', 'x', 'y']
data_pos.to_csv(results_folder + 'AIS_maritime_data_de_far.csv', index=False)

##########################################################################
# %% 6. MarineCadastre.gov Vessel Traffic Data ###############################

# Structure
# id,t,longitude,latitude,x,y,signed_turn,bearing,time_gap,distance_gap,euc_speed,distanceToShore,label

data_files = ['./MarineCadastre/AIS_2022_01_01.csv',
	      	  './MarineCadastre/AIS_2022_01_02.csv',
			  './MarineCadastre/AIS_2022_01_03.csv',]

all_data = []
for data_file in tqdm(data_files):
	data = pd.read_csv(data_file,
						keep_default_na=False,
						skiprows=1,
						usecols=[0, 1, 2, 3],
						names=['lineId', 'time', 'x', 'y'])
	data.dropna(inplace=True)
	data.drop_duplicates(inplace=True)
	data['time'] = pd.to_datetime(data['time'])
	data['time'] = data['time'].apply(lambda x: x.timestamp())
	all_data.append(data)

all_data = pd.concat(all_data)
all_data = all_data.sort_values(by=['lineId', 'time'])
all_data['lineId'] = all_data['lineId'].astype(str)
all_data = all_data[all_data['x'] > 10]
all_data = all_data[all_data['x'] < 60]
all_data = all_data[all_data['y'] > -100]
all_data = all_data[all_data['y'] < -60]


#%% remove lineId with less than 300 rows
lineId_count = all_data.groupby('lineId').size().reset_index(name='counts')
lineId_count = lineId_count[lineId_count['counts'] > 500]
lineId_count = lineId_count['lineId'].tolist()
all_data = all_data[all_data['lineId'].isin(lineId_count)]

#%%
# calculate the diagonal distance of the canvas
x_range = all_data['x'].max() - all_data['x'].min()
y_range = all_data['y'].max() - all_data['y'].min()
diag = np.sqrt(x_range**2 + y_range**2)

# seperate the line if the position gap is larger than 10% of the diagonal
threshold = diag * 0.1
all_data.reset_index(drop=True, inplace=True)
all_data['x_gap'] = all_data.groupby('lineId')['x'].diff()
all_data['x_gap'] = all_data['x_gap'].fillna(0)
all_data['y_gap'] = all_data.groupby('lineId')['y'].diff()
all_data['y_gap'] = all_data['y_gap'].fillna(0)
all_data['pos_gap'] = np.sqrt(all_data['x_gap']**2 + all_data['y_gap']**2)
all_data['too_far'] = all_data['pos_gap'].apply(lambda x: 1 if x > threshold else 0)
all_data['lineId2'] = all_data['lineId'] + '-' + all_data['too_far'].cumsum().astype(str)

#%% save
data_original = all_data[['lineId', 'time', 'x', 'y']]
data_cleaned = all_data[['lineId2', 'time', 'x', 'y']]
data_cleaned.columns = ['lineId', 'time', 'x', 'y']
data_original.to_csv(results_folder + 'MarineCadastre_3days.csv', index=False)
data_cleaned.to_csv( results_folder + 'MarineCadastre_3days_cleaned.csv', index=False)

#%% random sample half of the data
data_cleaned = data_cleaned.sample(frac=0.5, random_state=1)
data_cleaned.to_csv( results_folder + 'MarineCadastre_3days_cleaned_half.csv', index=False)


##########################################################################
# %% MarineCadastre.gov gpkg ################################################
# import geopandas as gpd
# data = gpd.read_file('./MarineCadastre/AISVesselTracks2021.gpkg')
# data.head()

# %% MarineCadastre.gov gdb ################################################

# list all layers in the gdb
# ['Tracks_2018_01', ... , 'Tracks_2018_12']
data_folder = './MarineCadastre/'
datasets = ['Atlantic', 'GreatLakes', 'GulfOfMexico', 'Pacific', 'WestCoast']
idx = 2
dataset = data_folder + datasets[idx] + '.gdb'

import fiona
layers = fiona.listlayers(dataset)

#%%
# strucutre
# MMSI, TrackStartTime, TrackEndTime, ... , DurationMinutes, ..., geometry
# geometry: [LAT, LON, LAT, LON]

all_data = []

# read the layers
import geopandas as gpd
for layer in layers:
	data = gpd.read_file(dataset, layer=layer)
	# data.head()
	data.dropna(inplace=True)
	data.drop_duplicates(inplace=True)

	# store the track into points
	for i, row in tqdm(data.iterrows()):
		# get values from MultiLineString
		lon_1 = row['geometry'].bounds[0]
		lat_1 = row['geometry'].bounds[1]
		lon_2 = row['geometry'].bounds[2]
		lat_2 = row['geometry'].bounds[3]
		all_data.append([row['MMSI'], row['TrackStartTime'], lon_1, lat_1])
		all_data.append([row['MMSI'], row['TrackEndTime'],   lon_2, lat_2])

	# save Jan data 
	if layer == 'Tracks_2018_01':
		Jan_data = pd.DataFrame(all_data, columns=['lineId', 'time', 'x', 'y'])
		Jan_data['time'] = Jan_data['time'].apply(lambda x: x.timestamp())
		Jan_data.to_csv(results_folder + 'MarineCadastre_%s_201801.csv'%(datasets[idx]), index=False)

all_data = pd.DataFrame(all_data, columns=['lineId', 'time', 'x', 'y'])
all_data['time'] = all_data['time'].apply(lambda x: x.timestamp())
all_data.to_csv(results_folder + 'MarineCadastre_%s_2018.csv'%(datasets[idx]), index=False)
# %% cleaning MarineCadastre.gov results ####################################
# datasets = ['Atlantic_201801', 'Atlantic_2018', ]
datasets = ['GulfOfMexico_201801', 'GulfOfMexico_2018']
for dataset in datasets:
	data = pd.read_csv(results_folder + 'MarineCadastre_%s.csv'%(dataset))
	data.dropna(inplace=True)
	data.drop_duplicates(inplace=True)
	data['lineId'] = data['lineId'].astype(str)
	
	# # seperate the line if the position gap is larger than 30% of the diagonal
	x_range = data['x'].max() - data['x'].min()
	y_range = data['y'].max() - data['y'].min()
	diag = np.sqrt(x_range**2 + y_range**2)
	threshold = diag * 0.3
	data.reset_index(drop=True, inplace=True)
	data['x_gap'] = data.groupby('lineId')['x'].diff()
	data['x_gap'] = data['x_gap'].fillna(0)
	data['y_gap'] = data.groupby('lineId')['y'].diff()
	data['y_gap'] = data['y_gap'].fillna(0)
	data['pos_gap'] = np.sqrt(data['x_gap']**2 + data['y_gap']**2)
	data['too_far'] = data['pos_gap'].apply(lambda x: 1 if x > threshold else 0)
	data['lineId2'] = data['lineId'] + '-' + data['too_far'].cumsum().astype(str)
	
	# seperate the line if the time gap is larger than 24 hour
	data.reset_index(drop=True, inplace=True)
	data['time_gap'] = data.groupby('lineId')['time'].diff()
	data['time_gap'] = data['time_gap'].fillna(0)
	data['too_late'] = data['time_gap'].apply(lambda x: 1 if x > 24*3600 else 0)
	data['lineId3'] = data['lineId'] + '-' + data['too_late'].cumsum().astype(str)
	
	# save
	data_pos = data[['lineId2', 'time', 'x', 'y']]
	data_pos.columns = ['lineId', 'time', 'x', 'y']
	data_pos.to_csv(results_folder + 'MarineCadastre_%s_de_far.csv'%(dataset), index=False)
	
	data_time = data[['lineId3', 'time', 'x', 'y']]
	data_time.columns = ['lineId', 'time', 'x', 'y']
	data_time.to_csv(results_folder + 'MarineCadastre_%s_de_late.csv'%(dataset), index=False)

# %% random sample 10,000 lines from the data
# dataset = 'Atlantic_2018'
dataset = 'GulfOfMexico_2018'
data = pd.read_csv(results_folder + 'MarineCadastre_%s_de_late.csv'%(dataset))
data.dropna(inplace=True)
data.drop_duplicates(inplace=True)
data['lineId'] = data['lineId'].astype(str)

# random sample 10,000 lines
lines = data['lineId'].unique()
lines = np.random.choice(lines, 10000, replace=False)
data_cleaned = data[data['lineId'].isin(lines)]
data_cleaned.to_csv(results_folder + 'MarineCadastre_%s_de_late_10k.csv'%(dataset), index=False)

# %% 7. Hellenic Trench AIS data ################################################
data = pd.read_csv('./Hellenic Trench AIS data/all_ais.csv')
data = data[['MMSI', ' TIMESTAMP_UTC', ' LON', ' LAT']]
data.columns = ['lineId', 'time', 'x', 'y']

data['lineId'] = data['lineId'].astype(str)
data['time'] = pd.to_datetime(data['time'])
data['time'] = data['time'].apply(lambda x: x.timestamp())
data = data.sort_values(by=['lineId', 'time'])

# remove the data with the same timestamp
data.drop_duplicates(inplace=True)
data.reset_index(drop=True, inplace=True)

# seperate the line if the time gap is larger than 1 hour
data['time_gap'] = data.groupby('lineId')['time'].diff()
data['time_gap'] = data['time_gap'].fillna(0)
data['too_late'] = data['time_gap'].apply(lambda x: 1 if x > 3600 else 0)
data['lineId2'] = data['lineId'] + '-' + data['too_late'].cumsum().astype(str)

data = data[['lineId2', 'time', 'x', 'y']]
data.columns = ['lineId', 'time', 'x', 'y']

# randomly sample 10,000 lines
lines = data['lineId'].unique()
lines = np.random.choice(lines, 10000, replace=False)
data_cleaned = data[data['lineId'].isin(lines)]
data_cleaned.to_csv(results_folder + 'HellenicTrench_10k.csv', index=False)
# %% 8. Mediterrannean Sea Trajectory data ######################################
	
# Strucutre
# obs,traj,MPA,distance,land,lat,lon,temp,time,z

datasets = ['nostokes', 'stokes']
for dataset in datasets:
	data = pd.read_csv('./Mediterranean Sea Trajectory Data/trajectories_%s_subset_10000.csv'%(dataset))
	lineIds = data['traj'].unique()
	data['time'] = pd.to_datetime(data['time'])
	data['time'] = data['time'].apply(lambda x: x.timestamp())
	data = data[['traj', 'time', 'lon', 'lat']]
	data.columns = ['lineId', 'time', 'x', 'y']
	data = data.sort_values(by=['lineId', 'time'])
	data.to_csv(results_folder + 'MediterranneanSeaTrajectory_%s_10k.csv'%(dataset), index=False)

#%%
datasets = ['nostokes', 'stokes']
for dataset in datasets:
	# randomly sample 5,000 lines
	lines = data['lineId'].unique()
	lines = np.random.choice(lines, 5000, replace=False)
	data_cleaned = data[data['lineId'].isin(lines)]
	data_cleaned.to_csv(results_folder + 'MediterranneanSeaTrajectory_%s_5k.csv'%(dataset), index=False)

	# randomly sample 2,000 lines
	lines = data['lineId'].unique()
	lines = np.random.choice(lines, 2000, replace=False)
	data_cleaned = data[data['lineId'].isin(lines)]
	data_cleaned.to_csv(results_folder + 'MediterranneanSeaTrajectory_%s_2k.csv'%(dataset), index=False)

	# only keep the first 120 points out of 960 points (5 days out of 40 days)
	data_cleaned = data.groupby('lineId').head(120)
	data_cleaned.to_csv(results_folder + 'MediterranneanSeaTrajectory_%s_5d.csv'%(dataset), index=False)

# %% 9. ATL2MED ###############################################################
import netCDF4 as nc
import pandas as pd
import numpy as np

# read the data
data_obj = nc.Dataset('./ATL2MED/EP_ERD_SLD_ATME_AL_PP_955.nc')
data_obj.variables.keys()
# dict_keys(['trajectory', 'rowSize', 'time', 'latitude', 'longitude', 'SOG', 'SOG_FILTERED_MEAN', 'SOG_FILTERED_STDDEV', 'SOG_FILTERED_MAX', 'SOG_FILTERED_MIN', 'COG', 'COG_FILTERED_MEAN', 'COG_FILTERED_STDDEV', 'HDG', 'HDG_FILTERED_MEAN', 'HDG_FILTERED_STDDEV', 'ROLL_FILTERED_MEAN', 'ROLL_FILTERED_STDDEV', 'ROLL_FILTERED_PEAK', 'PITCH_FILTERED_MEAN', 'PITCH_FILTERED_STDDEV', 'PITCH_FILTERED_PEAK', 'HDG_WING', 'WING_HDG_FILTERED_MEAN', 'WING_HDG_FILTERED_STDDEV', 'WING_ROLL_FILTERED_MEAN', 'WING_ROLL_FILTERED_STDDEV', 'WING_ROLL_FILTERED_PEAK', 'WING_PITCH_FILTERED_MEAN', 'WING_PITCH_FILTERED_STDDEV', 'WING_PITCH_FILTERED_PEAK', 'WING_ANGLE', 'UWND_MEAN', 'UWND_STDDEV', 'VWND_MEAN', 'VWND_STDDEV', 'WWND_MEAN', 'WWND_STDDEV', 'GUST_WND_MEAN', 'GUST_WND_STDDEV', 'WIND_MEASUREMENT_HEIGHT_MEAN', 'WIND_MEASUREMENT_HEIGHT_STDDEV', 'TEMP_AIR_MEAN', 'TEMP_AIR_STDDEV', 'RH_MEAN', 'RH_STDDEV', 'BARO_PRES_MEAN', 'BARO_PRES_STDDEV', 'PAR_AIR_MEAN', 'PAR_AIR_STDDEV', 'TEMP_IR_SEA_WING_UNCOMP_MEAN', 'TEMP_IR_SEA_WING_UNCOMP_STDDEV', 'WAVE_DOMINANT_PERIOD', 'WAVE_SIGNIFICANT_HEIGHT', 'TEMP_SBE37_MEAN', 'TEMP_SBE37_STDDEV', 'SAL_SBE37_MEAN', 'SAL_SBE37_STDDEV', 'COND_SBE37_MEAN', 'COND_SBE37_STDDEV', 'TEMP_CTD_RBR_MEAN', 'TEMP_CTD_RBR_STDDEV', 'SAL_RBR_MEAN', 'SAL_RBR_STDDEV', 'COND_RBR_MEAN', 'COND_RBR_STDDEV', 'O2_CONC_SBE37_MEAN', 'O2_CONC_SBE37_STDDEV', 'O2_SAT_SBE37_MEAN', 'O2_SAT_SBE37_STDDEV', 'O2_CONC_RBR_MEAN', 'O2_CONC_RBR_STDDEV', 'O2_SAT_RBR_MEAN', 'O2_SAT_RBR_STDDEV', 'TEMP_O2_RBR_MEAN', 'TEMP_O2_RBR_STDDEV', 'CHLOR_WETLABS_MEAN', 'CHLOR_WETLABS_STDDEV', 'CHLOR_RBR_MEAN', 'CHLOR_RBR_STDDEV'])

# %% turn the data into a dataframe
data = pd.DataFrame()
data['time'] = data_obj.variables['time'][:]
data['x'] = data_obj.variables['longitude'][:]
data['y'] = data_obj.variables['latitude'][:]
print(data.shape)
data.dropna(inplace=True)
data.drop_duplicates(inplace=True)
print(data.shape)
# %% cal time gap
data = data.sort_values(by=['time'])
data.reset_index(drop=True, inplace=True)
data['time_gap'] = data['time'].diff()
#%% seperate the data into different trajectories
data['lineId'] = (data['time_gap'] > 60).cumsum()
#%% save the data
data = data[['lineId', 'time', 'x', 'y']]
data.to_csv('./cleaned_data/' + 'ATL2MED.csv', index=False)
# %%
print(data['x'].max(), data['x'].min())
print(data['y'].max(), data['y'].min())

########################################################################################
# %% 10.  ###############################################################
