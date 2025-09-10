import re
from typing import List, Dict
import oracledb  # or use cx_Oracle if needed
import logging
from datetime import datetime
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OracleDBHandler(logging.Handler):
    def __init__(self, dsn, user, password):
        super().__init__()
        self.connection = oracledb.connect(user=user, password=password, dsn=dsn, mode=oracledb.SYSDBA)
        self.cursor = self.connection.cursor()
        self._ensure_tables_exist()

    def _ensure_resource_tables_exist(self):
        cursor = self.connection.cursor()
        table_creations = [
            """
            CREATE TABLE SYSTEM_RESOURCE_SUMMARY (
                TIMESTAMP VARCHAR2(50) PRIMARY KEY,
                CPU_USAGE FLOAT,
                MEMORY_USAGE FLOAT,
                NETWORK_CONNECTIONS NUMBER,
                LOAD_1 FLOAT,
                LOAD_5 FLOAT,
                LOAD_15 FLOAT
            )
            """,
            """
            CREATE TABLE DISK_USAGE_INFO (
                TIMESTAMP VARCHAR2(50),
                MOUNT_POINT VARCHAR2(255),
                TOTAL NUMBER,
                USED NUMBER,
                FREE NUMBER,
                PERCENT_USED FLOAT
            )
            """,
            """
            CREATE TABLE RESOURCE_ANOMALIES (
                TIMESTAMP VARCHAR2(50),
                ANOMALY_TYPE VARCHAR2(100)
            )
            """
        ]
        tables = [
            "SYSTEM_RESOURCE_SUMMARY",
            "DISK_USAGE_INFO",
            "RESOURCE_ANOMALIES",
        ]
        # Check if the table exists
        
        for ddl, table in zip(table_creations, tables):
            try:
                cursor.execute(f"SELECT COUNT(*) FROM user_tables WHERE table_name = '{table}'")
                table_exists = cursor.fetchone()[0] > 0

                if not table_exists:
                    cursor.execute(ddl)
                    logger.info(f"Table '{table}' created successfully.")
                else:
                    logger.debug(f"Table '{table}' already exists.")
            except oracledb.DatabaseError as e:
                if 'ORA-00955' in str(e):  # already exists
                    continue
                else:
                    raise
        cursor.close()

    def _insert_resource_results_to_db(self, results: Dict):
        cursor = self.connection.cursor()
        self._ensure_resource_tables_exist()
        # Insert system resource summary
        load1, load5, load15 = results['load_average']
        cursor.execute("""
            INSERT INTO SYSTEM_RESOURCE_SUMMARY (
                TIMESTAMP, CPU_USAGE, MEMORY_USAGE,
                NETWORK_CONNECTIONS, LOAD_1, LOAD_5, LOAD_15
            ) VALUES (:1, :2, :3, :4, :5, :6, :7)
        """, [
            results['timestamp'],
            results['cpu_usage'],
            results['memory_usage'],
            results['network_connections'],
            load1, load5, load15
        ])

        # Insert disk usage info
        disk_data = [
            (
                results['timestamp'],
                mount_point,
                data['total'],
                data['used'],
                data['free'],
                data['percent']
            )
            for mount_point, data in results['disk_usage'].items()
        ]
        cursor.executemany("""
            INSERT INTO DISK_USAGE_INFO (
                TIMESTAMP, MOUNT_POINT, TOTAL, USED, FREE, PERCENT_USED
            ) VALUES (:1, :2, :3, :4, :5, :6)
        """, disk_data)

        # Insert anomalies
        if 'anomalies' in results:
            anomaly_data = [
                (results['timestamp'], anomaly)
                for anomaly in results['anomalies']
            ]
            cursor.executemany("""
                INSERT INTO RESOURCE_ANOMALIES (
                    TIMESTAMP, ANOMALY_TYPE
                ) VALUES (:1, :2)
            """, anomaly_data)

        self.connection.commit()
        cursor.close()


    def _ensure_integrity_tables_exist(self):
        cursor = self.connection.cursor()
        table_creations = [
            """
            CREATE TABLE SYSTEM_INTEGRITY_SUMMARY (
                TIMESTAMP VARCHAR2(50) PRIMARY KEY
            )
            """,
            """
            CREATE TABLE SYSTEM_FILES_INFO (
                TIMESTAMP VARCHAR2(50),
                FILE_PATH VARCHAR2(500),
                FILE_SIZE NUMBER,
                MTIME FLOAT,
                PERMISSIONS VARCHAR2(10)
            )
            """,
            """
            CREATE TABLE WORLD_WRITABLE_FILES (
                TIMESTAMP VARCHAR2(50),
                FILE_PATH VARCHAR2(500)
            )
            """
        ]
        tables = [
            "SYSTEM_INTEGRITY_SUMMARY",
            "SYSTEM_FILES_INFO",
            "WORLD_WRITABLE_FILES",
        ]
        for ddl, table in zip(table_creations, tables):
            try:
                cursor.execute(f"SELECT COUNT(*) FROM user_tables WHERE table_name = '{table}'")
                table_exists = cursor.fetchone()[0] > 0

                if not table_exists:
                    cursor.execute(ddl)
                    logger.info(f"Table '{table}' created successfully.")
                else:
                    logger.debug(f"Table '{table}' already exists.")
            except oracledb.DatabaseError as e:
                if 'ORA-00955' in str(e):  # table exists
                    continue
                else:
                    raise
        cursor.close()

    def _insert_integrity_results_to_db(self, results: Dict):
        cursor = self.connection.cursor()
        self._ensure_integrity_tables_exist()
        # Insert summary
        cursor.execute("""
            INSERT INTO SYSTEM_INTEGRITY_SUMMARY (TIMESTAMP)
            VALUES (:1)
        """, [results['timestamp']])

        # Insert critical system files
        file_info_data = [
            (
                results['timestamp'],
                path,
                meta['size'],
                meta['mtime'],
                meta['permissions']
            )
            for path, meta in results['system_files'].items()
        ]
        cursor.executemany("""
            INSERT INTO SYSTEM_FILES_INFO (TIMESTAMP, FILE_PATH, FILE_SIZE, MTIME, PERMISSIONS)
            VALUES (:1, :2, :3, :4, :5)
        """, file_info_data)

        # Insert world-writable files
        cursor.executemany("""
            INSERT INTO WORLD_WRITABLE_FILES (TIMESTAMP, FILE_PATH)
            VALUES (:1, :2)
        """, [
            (results['timestamp'], path)
            for path in results['permissions'].get('world_writable', [])
        ])

        self.connection.commit()
        cursor.close()


    def _ensure_tables_exist(self):
        cursor = self.connection.cursor()
        table_creations = [
            """
            CREATE TABLE PROCESS_SUMMARY (
                TIMESTAMP VARCHAR2(50) PRIMARY KEY,
                TOTAL_PROCESSES NUMBER
            )
            """,
            """
            CREATE TABLE HIGH_RESOURCE_PROCESSES (
                TIMESTAMP VARCHAR2(50),
                PID NUMBER,
                NAME VARCHAR2(255),
                CPU_PERCENT FLOAT,
                MEMORY_PERCENT FLOAT
            )
            """,
            """
            CREATE TABLE NETWORK_PROCESSES (
                TIMESTAMP VARCHAR2(50),
                PID NUMBER,
                NAME VARCHAR2(255),
                CONNECTIONS NUMBER
            )
            """,
            """
            CREATE TABLE SUSPICIOUS_PROCESSES (
                TIMESTAMP VARCHAR2(50),
                PID NUMBER,
                NAME VARCHAR2(255),
                CMDLINE CLOB
            )
            """
        ]
        tables = [
            "PROCESS_SUMMARY",
            "HIGH_RESOURCE_PROCESSES",
            "NETWORK_PROCESSES",
            "SUSPICIOUS_PROCESSES",
        ]
        for ddl, table in zip(table_creations, tables):
            try:
                cursor.execute(f"SELECT COUNT(*) FROM user_tables WHERE table_name = '{table}'")
                table_exists = cursor.fetchone()[0] > 0

                if not table_exists:
                    cursor.execute(ddl)
                    logger.info(f"Table '{table}' created successfully.")
                else:
                    logger.debug(f"Table '{table}' already exists.")
            except oracledb.DatabaseError as e:
                if 'ORA-00955' in str(e):  # table already exists
                    continue
                else:
                    raise
        cursor.close()

    def _is_suspicious_process(self, proc_info):
        suspicious_keywords = ['keylogger', 'hack', 'crack', 'malware']
        cmdline = ' '.join(proc_info.get('cmdline', []))
        return any(keyword in cmdline.lower() for keyword in suspicious_keywords)

    def _insert_results_to_db(self, results: Dict):
        cursor = self.connection.cursor()
        self._ensure_tables_exist()
        # Insert summary
        cursor.execute("""
            INSERT INTO PROCESS_SUMMARY (TIMESTAMP, TOTAL_PROCESSES)
            VALUES (:1, :2)
        """, [results['timestamp'], results['total_processes']])

        # Batch insert high resource
        cursor.executemany("""
            INSERT INTO HIGH_RESOURCE_PROCESSES (TIMESTAMP, PID, NAME, CPU_PERCENT, MEMORY_PERCENT)
            VALUES (:1, :2, :3, :4, :5)
        """, [
            (results['timestamp'], p['pid'], p['name'], p['cpu_percent'], p['memory_percent'])
            for p in results['high_resource_processes']
        ])

        # Batch insert network
        cursor.executemany("""
            INSERT INTO NETWORK_PROCESSES (TIMESTAMP, PID, NAME, CONNECTIONS)
            VALUES (:1, :2, :3, :4)
        """, [
            (results['timestamp'], p['pid'], p['name'], p['connections'])
            for p in results['network_processes']
        ])

        # Batch insert suspicious
        cursor.executemany("""
            INSERT INTO SUSPICIOUS_PROCESSES (TIMESTAMP, PID, NAME, CMDLINE)
            VALUES (:1, :2, :3, :4)
        """, [
            (results['timestamp'], p['pid'], p['name'], ' '.join(p['cmdline']))
            for p in results['suspicious_processes']
        ])

        self.connection.commit()
        cursor.close()

    def _ensure_process_anomaly_table_exists(self):
        cursor = self.connection.cursor()
        try:
            cursor.execute("""
                CREATE TABLE PROCESS_ANOMALIES (
                    ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    TYPE VARCHAR2(50),
                    PID NUMBER,
                    NAME VARCHAR2(255),
                    CMDLINE CLOB,
                    CPU_PERCENT FLOAT,
                    MEMORY_PERCENT FLOAT,
                    TIMESTAMP TIMESTAMP
                )
            """)
        except oracledb.DatabaseError as e:
            if 'ORA-00955' in str(e):  # table already exists
                pass
            else:
                raise
        cursor.close()

    def insert_anomalies_into_db(self, anomalies: List[Dict]):
        if not anomalies:
            return
        self._ensure_process_anomaly_table_exists()
        cursor = self.connection.cursor()
        data_to_insert = []

        for entry in anomalies:
            try:
                timestamp = datetime.fromisoformat(entry.get('timestamp'))
            except ValueError:
                timestamp = datetime.now()

            data_to_insert.append((
                entry.get('type'),
                entry.get('pid'),
                entry.get('name'),
                ' '.join(entry.get('cmdline', [])) if isinstance(entry.get('cmdline'), list) else str(entry.get('cmdline')),
                entry.get('cpu_percent') if 'cpu_percent' in entry else None,
                entry.get('memory_percent') if 'memory_percent' in entry else None,
                timestamp
            ))

        cursor.executemany("""
            INSERT INTO PROCESS_ANOMALIES (
                TYPE, PID, NAME, CMDLINE, CPU_PERCENT, MEMORY_PERCENT, TIMESTAMP
            ) VALUES (:1, :2, :3, :4, :5, :6, :7)
        """, data_to_insert)

        self.connection.commit()
        cursor.close()



    def _create_tables(self):
        create_processes_table = """
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE TABLE processes (
                        id NUMBER GENERATED BY DEFAULT ON NULL AS IDENTITY PRIMARY KEY,
                        label VARCHAR2(60),
                        value FLOAT,
                        logged_at TIMESTAMP
                    )
                ';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN
                        RAISE;
                    END IF;
            END;
        """       

        try:
            self.cursor.execute(create_processes_table)
            print("Created or confirmed existence of 'processes' table.")
            
            self.connection.commit()

        except oracledb.Error as e:
            print(f"Failed to create tables: {e}")
            raise

        create_security_logs_table = """
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE TABLE security_logs (
                        id NUMBER GENERATED BY DEFAULT ON NULL AS IDENTITY PRIMARY KEY,
                        log_time TIMESTAMP,
                        log_level VARCHAR2(20),
                        message CLOB
                    )
                ';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN
                        RAISE;
                    END IF;
            END;
        """

        try:
            
            self.cursor.execute(create_security_logs_table)
            print("Created or confirmed existence of 'security_logs' table.")            
            self.connection.commit()

        except oracledb.Error as e:
            print(f"Failed to create tables: {e}")
            raise
    def emit(self, record):
        self._create_tables()

        log_time = datetime.now()
        log_level = record.levelname
        message = self.format(record)
        try:
            # Always insert into logs
            self.cursor.execute(
                "INSERT INTO security_logs (log_time, log_level, message) VALUES (:1, :2, :3)",
                (log_time, log_level, message)
            )

            # Try to extract metric
            match = re.match(r'^\s*([A-Za-z_][\w]*)\s*=\s*([-+]?[0-9]*\.?[0-9]+)\s*$', message)
            if match:
                self.insert_process_metric(match.group(1), float(match.group(2)), log_time)

            self.connection.commit()

        except Exception as e:
            print(f"[DB Logging Error] {e}")

    def insert_process_metric(self, label: str, value: float, log_time=None):
        if log_time is None:
            log_time = datetime.now()
        try:
            self.cursor.execute(
                "INSERT INTO processes (label, value, logged_at) VALUES (:1, :2, :3)",
                (label, value, log_time)
            )
            self.connection.commit()
        except Exception as e:
            print(f"[Metric Insert Error] {e}")

    def close(self):
        try:
            self.cursor.close()
            self.connection.close()
        except:
            pass
        super().close()
