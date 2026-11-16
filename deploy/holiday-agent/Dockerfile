FROM jsinnovia-cockpit:2b53f88
USER root
COPY agent.cjs render.py logo.png /opt/holiday/
ENV PYTHONDONTWRITEBYTECODE=1 OMP_NUM_THREADS=2
USER 1000:1000
WORKDIR /work
ENTRYPOINT ["node","/opt/holiday/agent.cjs"]
