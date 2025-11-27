FROM public.ecr.aws/lambda/python:3.11

# Install system libs needed by Pillow
RUN yum -y install libjpeg-turbo-devel zlib-devel && yum clean all

# Copy requirements and install into the Lambda task root
COPY requirements.txt  
RUN pip3 install -r requirements.txt --target ""

# Copy function code
COPY . 

CMD ["lambda_function.lambda_handler"]
