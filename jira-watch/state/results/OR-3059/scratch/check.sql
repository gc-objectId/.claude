SET search_path TO "mayo-mayo";
SELECT operating_room_name, building_code, facility, cardiac, excluded FROM mayo_operation_rooms_v ORDER BY 1;
SELECT 'mayo_operations' AS view, case_id, operating_room_name FROM mayo_operations
UNION ALL
SELECT 'mayo_shared_metric_operations_v', case_id, operating_room_name FROM mayo_shared_metric_operations_v
ORDER BY 1, 2;
