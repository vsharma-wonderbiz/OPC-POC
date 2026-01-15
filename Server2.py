import os
import time
import json
import datetime
from collections import defaultdict
from opcua import Server
from pymodbus.client.sync import ModbusTcpClient
from dotenv import load_dotenv

load_dotenv()


OPCUA_URL = os.getenv("OPCUA_URL")
NAMESPACE = os.getenv("NAMESPACE")
UPDATE_INTERVAL_SEC = float(os.getenv("UPDATE_INTERVAL_SEC", 2))

MODBUS_IP = os.getenv("MODBUS_IP")
MODBUS_PORT = int(os.getenv("MODBUS_PORT"))
NUM_REGISTERS = int(os.getenv("NUM_REGISTERS", 6))

with open("machines_config.json", "r") as f:
    MACHINES_CONFIG = json.load(f)


server = Server()
server.set_endpoint(OPCUA_URL)
ns_idx = server.register_namespace(NAMESPACE)
objects_node = server.get_objects_node()

Machines = {}       # OPC UA machine nodes
Machine_vars = {}   # OPC UA variable nodes

#These cretes nodes dynamically
for machine_name, machine_cfg in MACHINES_CONFIG.items():
    machine_node = objects_node.add_object(ns_idx, machine_name)
    Machines[machine_name] = machine_node
    Machine_vars[machine_name] = {}

    for signal_name, signal_info in machine_cfg["signals"].items():
        signal_node = machine_node.add_object(ns_idx, signal_name)
        value_node = signal_node.add_variable(ns_idx, "Value", 0.0)
        unit_node = signal_node.add_variable(ns_idx, "Unit", signal_info.get("unit", ""))
        timestamp_node = signal_node.add_variable(ns_idx, "Timestamp", "")

        value_node.set_writable()

        Machine_vars[machine_name][signal_name] = {
            "Value": value_node,
            "Unit": unit_node,
            "Timestamp": timestamp_node
        }

server.start()
print("OPC UA Server started at", OPCUA_URL)

#modbus clinet to get teh dagta from modbus
modbus_client = ModbusTcpClient(MODBUS_IP, port=MODBUS_PORT)
if modbus_client.connect():
    print(f"Connected to Modbus server at {MODBUS_IP}:{MODBUS_PORT}")
else:
    print("Failed to connect to Modbus server")
    exit(1)

#these is basically doen to optimoze like can have multiple salve to grouo them and make a call in one go 
slave_register_map = defaultdict(list)
for machine_name, machine_cfg in MACHINES_CONFIG.items():
    for signal_name, signal_info in machine_cfg["signals"].items():
        slave_id = signal_info["slave_id"]
        register = signal_info["register"]
        slave_register_map[slave_id].append((machine_name, signal_name, register))

#these basically reads the updates the data on the registers 
def update_variables_from_modbus():
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for slave_id, signals_list in slave_register_map.items():
        # Determine start register and count for bulk read
        registers_to_read = [reg for _, _, reg in signals_list]
        start_reg = min(registers_to_read)
        count = max(registers_to_read) - start_reg + 1

        result = modbus_client.read_holding_registers(
            address=start_reg,
            count=count,
            unit=slave_id
        )

        if result.isError():
            print(f"Failed to read Slave {slave_id}")
            continue

        registers = result.registers

        for machine_name, signal_name, reg in signals_list:
            idx = reg - start_reg
            value = registers[idx] / 100  # scaling if needed

            Machine_vars[machine_name][signal_name]["Value"].set_value(value)
            Machine_vars[machine_name][signal_name]["Unit"].set_value(
                MACHINES_CONFIG[machine_name]["signals"][signal_name].get("unit", "")
            )
            Machine_vars[machine_name][signal_name]["Timestamp"].set_value(now)

    # Optional: print for debugging
    print(f"Updated OPC UA variables at {now}")


try:
    while True:
        update_variables_from_modbus()
        time.sleep(UPDATE_INTERVAL_SEC)
except KeyboardInterrupt:
    print("Stopping server...")
finally:
    server.stop()
    modbus_client.close()
