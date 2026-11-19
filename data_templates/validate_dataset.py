# Usage: python validate_dataset.py participants.csv samples.csv images/
import sys, os, pandas as pd
p, s, img = pd.read_csv(sys.argv[1]), pd.read_csv(sys.argv[2]), sys.argv[3]
T = [c for c in p.columns if c.startswith('t_')]
errs = []
if p.writer_id.duplicated().any(): errs.append('duplicate writer_id in participants')
if s.sample_id.duplicated().any(): errs.append('duplicate sample_id in samples')
if set(s.writer_id) - set(p.writer_id): errs.append('samples with unknown writer_id')
if p[T].isna().any().any(): errs.append('missing trait scores')
miss = [x for x in s.image_path if not os.path.exists(os.path.join(img, os.path.basename(x)))]
if miss: errs.append(f'{len(miss)} image files not found')
few = s.groupby('writer_id').session.nunique(); few = few[few < 2]
if len(few): errs.append(f'{len(few)} writers have < 2 sessions (stability cannot be measured)')
print(f'writers={len(p)} samples={len(s)} tasks={s.task.value_counts().to_dict()}')
print(p[T].describe().loc[['mean','std','min','max']].round(2).to_string())
print('PROBLEMS:' if errs else 'OK', *errs, sep='\n  ')
