import time
import logging
from typing import Dict, Any

# Configure log formatting
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("EnterpriseAnalytics")

class IngestionTimer:
    """
    Timer utility to record processing speed of various dashboard steps.
    """
    def __init__(self):
        self.timings: Dict[str, float] = {}
        self._start: float = time.time()
        
    def start_segment(self, label: str):
        self.timings[label + "_start"] = time.time()
        logger.info(f"Starting segment: {label}")
        
    def end_segment(self, label: str):
        start_key = label + "_start"
        if start_key in self.timings:
            duration = time.time() - self.timings[start_key]
            self.timings[label] = round(duration, 4)
            logger.info(f"Finished segment: {label} in {self.timings[label]}s")
            
    def get_summary(self) -> Dict[str, float]:
        self.timings["total_duration"] = round(time.time() - self._start, 4)
        return {k: v for k, v in self.timings.items() if not k.endswith("_start")}
