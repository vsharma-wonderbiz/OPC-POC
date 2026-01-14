import os
import time
import json
import datetime
from opcua import Server
from pymodbus.client.sync import ModbusTcpClient
from dotenv import load_dotenv


load_dotenv()

OPCUA_URL = os.getenv("OPCUA_URL")
NAMESPACE = os.getenv("NAMESPACE")
UPDATE_INTERVAL_SEC = float(os.getenv("UPDATE_INTERVAL_SEC", 2))

MODBUS_IP = os.getenv("MODBUS_IP")
MODBUS_PORT = int(os.getenv("MODBUS_PORT"))
MODBUS_SLAVE_ID = int(os.getenv("MODBUS_SLAVE_ID", 1))
NUM_REGISTERS = int(os.getenv("NUM_REGISTERS"))

# Load machine & signal mapping from JSON
with open("machines_config.json", "r") as f:
    MACHINES_CONFIG = json.load(f)


server = Server()
server.set_endpoint(OPCUA_URL)
ns_idx = server.register_namespace(NAMESPACE)
objects_node = server.get_objects_node()



# Create machines and variable nodes
Machines = {}        # OPC UA object nodes
Machine_vars = {}    # Store variable nodes for easy updates



for machine_name, signals in MACHINES_CONFIG.items():
    # Machine object
    machine_node = objects_node.add_object(ns_idx, machine_name)
    Machines[machine_name] = machine_node
    Machine_vars[machine_name] = {}

    for signal_name, signal_info in signals.items():
        #Signal object in the machines
        signal_node = machine_node.add_object(ns_idx, signal_name)

        #these will e the metadat of the signals variable object 
        value_node = signal_node.add_variable(ns_idx, "Value", 0.0)
        unit_node = signal_node.add_variable(
            ns_idx,
            "Unit",
            signal_info.get("unit", "")
        )
        timestamp_node = signal_node.add_variable(ns_idx, "Timestamp", "")

        value_node.set_writable()

        # Store ALL nodes properly
        Machine_vars[machine_name][signal_name] = {
            "Value": value_node,
            "Unit": unit_node,
            "Timestamp": timestamp_node
        }



server.start()
print("OPC UA Server started at", OPCUA_URL)


modbus_client = ModbusTcpClient(MODBUS_IP, port=MODBUS_PORT)
if modbus_client.connect():
    print(f"Connected to Modbus server at {MODBUS_IP}:{MODBUS_PORT}")
else:
    print("Failed to connect to Modbus server")
    exit(1)


def update_variables_from_modbus():
    result = modbus_client.read_holding_registers(
        0,
        NUM_REGISTERS,
        unit=MODBUS_SLAVE_ID
    )
    if not result.isError():
        registers = result.registers
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for machine_name, signals in MACHINES_CONFIG.items():
            for signal_name, signal_info in signals.items():
                reg_idx = signal_info["register"]
                value = registers[reg_idx] / 100  # scale if needed

                Machine_vars[machine_name][signal_name]["Value"].set_value(value)
                Machine_vars[machine_name][signal_name]["Timestamp"].set_value(now)
                Machine_vars[machine_name][signal_name]["Unit"].set_value(signal_info.get("unit", ""))

        # Optional: print updated values
        print("Updated OPC UA variables from Modbus:")
        for machine_name in MACHINES_CONFIG.keys():
            vals = {}
            for sig, nodes in Machine_vars[machine_name].items():
                vals[sig] = {
                    "Value": nodes["Value"].get_value(),
                    "Unit": nodes["Unit"].get_value(),
                    "Timestamp": nodes["Timestamp"].get_value()
                }
            print(f" {machine_name}: {vals}")
            print()
    else:
        print("Failed to read Modbus registers")



try:
    while True:
        update_variables_from_modbus()
        time.sleep(UPDATE_INTERVAL_SEC)
except KeyboardInterrupt:
    print("Stopping server...")
finally:
    server.stop()
    modbus_client.close()
