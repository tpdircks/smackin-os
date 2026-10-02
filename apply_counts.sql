-- Apply Adriana 10/01 finished-bag counts to cloud stock.
-- Sets each item's TOTAL on-hand to target by adjusting its largest-qty location row.
-- (stock has no id column; keyed by item_id + location + lot)
with tgt(item_id, total) as (values
('BAG15-S01',21250),
('BAG15-S02',18750),
('BAG15-S03',32000),
('BAG15-S04',27750),
('BAG15-S05',3500),
('BAG15-S06',7750),
('BAG15-S07',28500),
('BAG15-S08',13500),
('BAG15-S09',10250),
('BAG15-S10',10750),
('BAG15-S11',16500),
('BAG4-S01',14500),
('BAG4-S02',42700),
('BAG4-S03',42600),
('BAG4-S04',33300),
('BAG4-S05',1700),
('BAG4-S06',8300),
('BAG4-S07',23000),
('BAG4-S08',20000),
('BAG4-S09',7100),
('BAG4-S10',11300),
('BAG4-S11',5700),
('BAG4-L13',0),
('BAG4-L10',21100),
('BAG4-L09',9200),
('BAG4-L01',24100),
('BAG4-L08',1700),
('BAG4-L02',16000),
('BAG4-L03',2700),
('BAG4-L07',8600),
('BAG4-L04',16200),
('BAG4-L14',15600),
('BAG4-L18',900),
('BAG4-L11',6800),
('BAG4-L12',12200),
('BAG4-L15',1700),
('BAG4-L05',10500),
('BAG4-L17',0),
('BAG4-L06',0),
('BAG4-L16',7700)
),
pri as (
  select distinct on (item_id) item_id, location, lot, qty
  from stock where item_id in (select item_id from tgt)
  order by item_id, qty desc
),
oth as (
  select item_id, coalesce(sum(qty),0) as total_all
  from stock where item_id in (select item_id from tgt)
  group by item_id
)
update stock s
set qty = greatest(t.total - (o.total_all - p.qty), 0),
    updated_at = now()
from tgt t
join pri p on p.item_id = t.item_id
join oth o on o.item_id = t.item_id
where s.item_id = p.item_id
  and s.location = p.location
  and coalesce(s.lot,'') = coalesce(p.lot,'');

-- verify a few
select i.id, coalesce(sum(s.qty),0)::int as on_hand
from items i left join stock s on s.item_id=i.id
where i.id in ('BAG15-S01','BAG15-S05','BAG4-S02','BAG4-S03','BAG4-S05','BAG4-S11','BAG4-L01')
group by i.id order by i.id;
-- expected: BAG15-S01=21250, BAG15-S05=3500, BAG4-S02=42700, BAG4-S03=42600, BAG4-S05=1700, BAG4-S11=5700, BAG4-L01=24100