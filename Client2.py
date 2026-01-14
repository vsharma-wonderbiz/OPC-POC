import os
import time
import sqlite3
import logging
from datetime import datetime
from opcua import Client
from dotenv import load_dotenv


load_dotenv()

OPCUA_URL = os.getenv("OPCUA_URL")
DB_FILE = os.getenv("DB_FILE","machine_data.db")
UPDATE_INTERVAL = int(os.getenv("UPDATE_INTERVAL", 2))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 10))  # for DB inserts


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

def parse_timestamp(ts_str: str) -> datetime:
    """Parse timestamp string into datetime, fallback to current time."""
    try:
        return datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        logging.warning(f"Invalid timestamp '{ts_str}', using current time")
        return datetime.now()
    
def normalize_unit(unit: str) -> str:
    try:
        return unit.encode("latin1").decode("utf-8")
    except UnicodeError:
        return unit


def init_db(db_file: str):
    """Initialize SQLite DB and create table if not exists."""
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS machine_signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine TEXT,
            signal TEXT,
            value REAL,
            unit TEXT,
            timestamp DATETIME
        )
    """)
    conn.commit()
    return conn, cursor

def extract_signal_data(signal_node):
    """Extract Value, Unit, Timestamp from a signal node."""
    try:
        children = {c.get_browse_name().Name: c for c in signal_node.get_children()}
        required = ["Value", "Unit", "Timestamp"]
        if not all(k in children for k in required):
            return None

        value = float(children["Value"].get_value())
        unit = str(children["Unit"].get_value())
        timestamp = parse_timestamp(str(children["Timestamp"].get_value()))
        return value, unit, timestamp

    except Exception as e:
        logging.warning(f"Failed to read signal '{signal_node}': {e}")
        return None

def fetch_machine_data(client):
    """Fetch all machine signals from OPC UA server."""
    data_batch = []
    objects = client.get_objects_node()
    machines = objects.get_children()

    for machine_node in machines:
        machine_name = machine_node.get_browse_name().Name
        signals = machine_node.get_children()

        for signal_node in signals:
            signal_name = signal_node.get_browse_name().Name
            signal_data = extract_signal_data(signal_node)
            if signal_data:
                value, unit, timestamp = signal_data
                data_batch.append((machine_name, signal_name, value, unit, timestamp))
            else:
                logging.debug(f"Skipping signal {machine_name}/{signal_name}")

    return data_batch

def insert_batch(cursor, data_batch):
    """Insert batch data into SQLite DB."""
    if data_batch:
        cursor.executemany("""
            INSERT INTO machine_signals
            (machine, signal, value, unit, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, data_batch)

def main():
    # Initialize DB
    conn, cursor = init_db(DB_FILE)

    try:
        with Client(OPCUA_URL) as client:
            logging.info(f"Connected to OPC UA server at {OPCUA_URL}")

            while True:
                data_batch = fetch_machine_data(client)
                if data_batch:
                    insert_batch(cursor, data_batch)
                    conn.commit()
                    logging.info(f"Stored {len(data_batch)} signals to DB")
                else:
                    logging.info("No signals fetched")

                time.sleep(UPDATE_INTERVAL)

    except KeyboardInterrupt:
        logging.info("Stopping client...")

    except Exception as e:
        logging.error(f"Unexpected error: {e}")

    finally:
        conn.close()
        logging.info("Database connection closed")

if __name__ == "__main__":
    main()
