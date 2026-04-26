import psycopg2
conn = psycopg2.connect(host='localhost', user='postgres', password='root', dbname='ahm')
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
print('Tables:', [r[0] for r in cur.fetchall()])
cur.execute('SELECT COUNT(*) FROM hospitals'); print('Hospitals:', cur.fetchone()[0])
cur.execute('SELECT COUNT(*) FROM doctors'); print('Doctors:', cur.fetchone()[0])
cur.execute('SELECT COUNT(*) FROM doctor_room_assignments'); print('Room assignments:', cur.fetchone()[0])
cur.execute('SELECT COUNT(*) FROM hospital_specialties'); print('Specialties:', cur.fetchone()[0])
conn.close()

# Chroma
from app.services.vector.embeddings import get_index_stats
print('Chroma:', get_index_stats())
