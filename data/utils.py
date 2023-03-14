# from pathlib import Path
import pandas as pd
import numpy as np
import pickle
import os



def list_dir(folder_path,  find_type='', preffix='', suffix='', sort_seps=None, sort_idxes=None):
	"""
		traverse the folder and returns all contents in order
		Args:
			folder_path: the path of the folder
			find_type: 'folder' or 'file', default is '' which means all
			preffix: the preffix of the file name, default is '' which means all
			suffix: the suffix of the file name, default is '' which means all
			sort_seps: the separators used to split the file name, default is None which means no split
			sort_idxes: the index of the file name after split, default is None which means no split
		Returns:
			contents: the list of contents in order
	"""
	contents = os.listdir(folder_path)
	if '.DS_Store' in contents: contents.remove('.DS_Store')
	if '._.DS_Store' in contents: contents.remove('._.DS_Store')

	# 按照文件类型过滤
	if find_type == 'folder':
		contents = [content for content in contents if os.path.isdir(os.path.join(folder_path, content))]
	elif find_type == 'file':
		contents = [content for content in contents if not os.path.isdir(os.path.join(folder_path, content))]

	# 按照前缀名过滤
	if preffix != '':
		contents = [content for content in contents if content.startswith(preffix)]

	# 按照后缀名过滤
	if suffix != '':
		contents = [content for content in contents if content.endswith(suffix)]

	# 按照文件名中指定位置的数字排序
	if (sort_seps is not None) and (sort_idxes is not None):
		assert len(sort_seps) == len(sort_idxes), 'Seps num should equals idx num'
		sep_num = len(sort_seps)
		def sort_info(name):
			for sep_idx in range(sep_num):
				sep = sort_seps[sep_idx]
				idx = sort_idxes[sep_idx]
				name = name.split(sep)[idx]
				if sep_idx == sep_num-1:
					return int(name)
		contents = sorted(contents, key=sort_info)
	# 未指定，直接按文件名排序
	else:
		contents = sorted(contents)
	
	return contents


def ensure_dir_exist(folder_path):
	"""
		make dir if it doesn't exist
	"""
	# dir = Path(folder_path)
	# dir.mkdir(exist_ok=True)
	if not os.path.exists(folder_path):
		os.makedirs(folder_path)	# 创建多级目录


def count_lines(file_path):
	"""
		count the number of lines
	"""
	from itertools import takewhile, repeat
	buffer = 1024 * 1024
	with open(file_path) as f:
		buf_gen = takewhile(lambda x: x, (f.read(buffer) for _ in repeat(None)))
		return sum(buf.count('\n') for buf in buf_gen)


def save_as_pickle(item, save_name='saved.pkl', save_path='./'):
	save_file = save_path + save_name
	assert os.path.exists(save_file)
	with open(save_file, 'wb') as f:
		pickle.dump(item, f)

def load_pickle(file_name, file_path='./'):
	load_file = file_path + file_name
	with open(load_file, 'rb') as f:
		item = pickle.load(f)
	return item


def max_min_normalize(data):
	"""
		normalize data to [0, 1]
	"""
	if len(data) == 0:
		return data
	if not isinstance(data, np.ndarray) and not isinstance(data, pd.Series):
		data = np.array(data)
	min_value = data.min()
	max_value = data.max()
	return (data - min_value) / (max_value - min_value)


def get_index_of_not_outliers(array, threshold=3):
	"""
		Find the index of those are not outliers in array
		Outliers are defined as values that are more than threshold standard deviations away from the mean
	"""
	if len(array) == 0:
		return []
	if not isinstance(array, np.ndarray) and not isinstance(array, pd.Series):
		array = np.array(array)
	mean = np.mean(array)
	std = np.std(array)
	# outliers_idx =  np.where(np.abs(array - mean) > threshold * std)[0]
	not_outliers_idx = np.where(np.abs(array - mean) <= threshold * std)[0]
	return not_outliers_idx


def cal_longtitue_center(lon1, lon2):
	"""
		Calculate the center of two longtitude
	"""
	if lon1 > lon2:
		lon1, lon2 = lon2, lon1
	if lon2 - lon1 > 180:
		return (lon1 + lon2 + 360) / 2
	else:
		return (lon1 + lon2) / 2